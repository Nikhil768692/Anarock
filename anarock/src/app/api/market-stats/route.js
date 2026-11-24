import { NextResponse } from "next/server";
import { getStatsTable, runZcqlQuery, STATS_TABLE_ID } from "@/lib/catalyst";
import { getOrFetchCache } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Market stats change rarely: cache for 1 hour (the response already tells
// the CDN to keep it for 1 hour too).
const CACHE_TTL = 60 * 60 * 1000;

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getModifiedTime(row) {
  const value =
    row?.MODIFIEDTIME ??
    row?.modifiedtime ??
    row?.ModifiedTime ??
    row?.modifiedTime;

  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

// After a ZCQL failure, skip ZCQL for a while instead of retrying every time.
const ZCQL_RETRY_AFTER_MS = 6 * 60 * 60 * 1000;
let zcqlBlockedUntil = 0;

// Reads only the latest row. If ZCQL is not available (for example the token
// lacks the ZohoCatalyst.zcql.CREATE scope), the whole table is read instead,
// as before.
async function fetchLatestStatsRows() {
  if (Date.now() >= zcqlBlockedUntil) {
    try {
      return await runZcqlQuery(
        `SELECT * FROM ${STATS_TABLE_ID} ORDER BY MODIFIEDTIME DESC LIMIT 1`,
      );
    } catch (error) {
      zcqlBlockedUntil = Date.now() + ZCQL_RETRY_AFTER_MS;
      console.warn("[Market Stats API] ZCQL failed, reading the whole table:", {
        message: error?.message,
        status: error?.status,
      });
    }
  }

  return fetchAllStatsRows();
}

async function fetchMarketStats() {
  return toMarketStats(await fetchLatestStatsRows());
}

async function fetchAllStatsRows() {
  const table = await getStatsTable();

  if (!table) {
    throw new Error("Stats Data Store table could not be initialized.");
  }

  if (typeof table.getPagedRows !== "function") {
    throw new Error("Stats Data Store table does not support pagination.");
  }

  const rows = [];

  let nextToken = null;
  let pageCount = 0;

  while (true) {
    pageCount += 1;
    if (pageCount > 100) {
      throw new Error("Stats pagination exceeded safety limit.");
    }

    const response = await table.getPagedRows({
      maxRows: 100,
      ...(nextToken ? { nextToken } : {}),
    });

    const pageRows = Array.isArray(response?.data) ? response.data : [];

    rows.push(...pageRows);

    const moreRecords =
      response?.more_records === true || response?.moreRecords === true;

    const newNextToken = response?.next_token || response?.nextToken || null;

    if (!moreRecords || !newNextToken) {
      break;
    }
    if (newNextToken === nextToken) {
      throw new Error("Stats pagination returned the same next token.");
    }

    nextToken = newNextToken;
  }

  return rows;
}

function toMarketStats(rows) {
  if (!rows.length) {
    return {
      totalStock: null,
      totalVacancy: null,
      totalAvailableSpace: null,
      areaTransacted: null,
      updatedAt: null,
    };
  }
  let latestRow = rows[0];

  for (let index = 1; index < rows.length; index += 1) {
    const currentRow = rows[index];

    if (getModifiedTime(currentRow) > getModifiedTime(latestRow)) {
      latestRow = currentRow;
    }
  }

  return {
    totalStock: toNumber(latestRow?.TotalStock),

    totalVacancy: toNumber(latestRow?.TotalVacancy),

    totalAvailableSpace: toNumber(latestRow?.TotalAvailableSpace),

    areaTransacted: toNumber(latestRow?.AreaTransacted),

    updatedAt:
      latestRow?.MODIFIEDTIME ??
      latestRow?.modifiedtime ??
      latestRow?.ModifiedTime ??
      latestRow?.modifiedTime ??
      null,
  };
}

export async function GET() {
  try {
    const stats = await getOrFetchCache(
      "catalyst:market-stats",
      fetchMarketStats,
      CACHE_TTL,
      {
        staleWhileRevalidate: true,
      },
    );

    return NextResponse.json(
      {
        success: true,
        data: stats,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("[Market Stats API] Failed:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch market stats",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}