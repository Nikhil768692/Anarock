import { NextResponse } from "next/server";
import { getKycTable } from "@/lib/catalyst";
import { getOrFetchCache } from "@/lib/cache";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// FAQ rows change rarely, so they are cached for 1 hour. Edits made in the
// Catalyst Data Store show up on the website within about an hour.
const CACHE_TTL = 60 * 60 * 1000;
const MAX_PAGES = 100;

function getField(row, fieldName) {
  if (!row || typeof row !== "object") return "";

  if (row[fieldName] !== undefined && row[fieldName] !== null) {
    return row[fieldName];
  }
  const matchedKey = Object.keys(row).find(
    (key) => key.toLowerCase() === fieldName.toLowerCase(),
  );

  return matchedKey ? (row[matchedKey] ?? "") : "";
}

function getTimestamp(row) {
  const value = getField(row, "CREATEDTIME");
  const timestamp = new Date(value || 0).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function fetchAllFaqRows() {
    const table = await getKycTable();
  const rows = [];
  let nextToken = null;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await table.getPagedRows({
      maxRows: 100,
      ...(nextToken ? { nextToken } : {}),
    });

    const pageRows = Array.isArray(result?.data) ? result.data : [];
    rows.push(...pageRows);

    const newNextToken = result?.next_token || result?.nextToken || null;
    const moreRecords =
      result?.more_records === true || result?.moreRecords === true;

    if (!moreRecords || !newNextToken || newNextToken === nextToken) {
      break;
    }

    nextToken = newNextToken;
  }

  return rows
    .map((row) => ({
      id: String(getField(row, "ROWID") || ""),
      question: String(getField(row, "Question") || "").trim(),
      answer: String(getField(row, "Answer") || "").trim(),
      createdAt: getTimestamp(row),
    }))
    .filter((faq) => faq.question && faq.answer)
    .sort(
      (a, b) =>
        a.createdAt - b.createdAt ||
        a.id.localeCompare(b.id, undefined, { numeric: true }),
    )
    .map(({ id, question, answer }) => ({ id, question, answer }));
}

export async function GET() {
  try {
    const faqs = await getOrFetchCache(
      "catalyst:faqs:all",
      fetchAllFaqRows,
      CACHE_TTL,
      { staleWhileRevalidate: true },
    );

    return NextResponse.json(
      {
        success: true,
        data: faqs,
        count: faqs.length,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    logger.error("[FAQ API] Failed:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
    });

    return NextResponse.json(
      {
        success: false,
        data: [],
        error: "Unable to load FAQs right now.",
      },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}