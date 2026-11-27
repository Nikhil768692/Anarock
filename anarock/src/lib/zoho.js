// Shared Zoho OAuth access token for every server route (CRM leads, cities,
// micro-markets). One refresh at a time; after Zoho reports too many token
// requests, new refreshes wait 5 minutes instead of making it worse.
const globalState = globalThis;

const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;
const MAX_AUTH_RETRIES = 1;
const DEFAULT_TIMEOUT_MS = 15000;
const TOKEN_REQUEST_TIMEOUT_MS = 10000;
const AUTH_RATE_LIMIT_WAIT_MS = 5 * 60 * 1000;

if (!globalState.__anarockZoho) {
  globalState.__anarockZoho = {
    accessToken: null,
    accessTokenExpiresAt: 0,
    apiDomain: null,
    refreshPromise: null,
    authFailureUntil: 0,
  };
}

const state = globalState.__anarockZoho;

function required(name) {
  const value = process.env[name];

  if (!value || !String(value).trim()) {
    throw new Error(`${name} is missing`);
  }

  return String(value).trim();
}

function getAccountsUrl() {
  return ("https://accounts.zoho.in").replace(
    /\/+$/,
    "",
  );
}

function getDefaultApiUrl() {
  return ("https://www.zohoapis.in").replace(
    /\/+$/,
    "",
  );
}

function clearAccessToken() {
  state.accessToken = null;
  state.accessTokenExpiresAt = 0;
  state.apiDomain = null;
}

function hasValidAccessToken() {
  return Boolean(
    state.accessToken &&
    state.accessTokenExpiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS,
  );
}

async function refreshZohoAccessToken() {
  if (state.refreshPromise) {
    return state.refreshPromise;
  }

  if (state.authFailureUntil && Date.now() < state.authFailureUntil) {
    const error = new Error("Zoho authentication is temporarily rate limited.");
    error.code = "ZOHO_AUTH_RATE_LIMITED";
    error.httpStatus = 429;
    throw error;
  }

  state.refreshPromise = (async () => {
    const clientId = required("ZOHO_CLIENT_ID");
    const clientSecret = required("ZOHO_CLIENT_SECRET");
    const refreshToken = required("ZOHO_REFRESH_TOKEN");

    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    });

    const response = await fetch(`${getAccountsUrl()}/oauth/v2/token`, {
      method: "POST",

      headers: {
        "Content-Type": "application/x-www-form-urlencoded",

        Accept: "application/json",
      },

      body: body.toString(),

      cache: "no-store",

      signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
    });

    const text = await response.text();

    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error("Zoho OAuth returned an invalid response");
    }

    if (
      response.status === 429 ||
      String(data?.error || data?.error_description || "")
        .toLowerCase()
        .includes("too many requests")
    ) {
      state.authFailureUntil = Date.now() + AUTH_RATE_LIMIT_WAIT_MS;
      const error = new Error("Zoho OAuth rate limit reached.");
      error.code = "ZOHO_AUTH_RATE_LIMITED";
      error.httpStatus = 429;
      throw error;
    }

    if (!response.ok || !data?.access_token) {
      const error = new Error(
        data?.error_description ||
        data?.error ||
        `Zoho OAuth refresh failed (${response.status})`,
      );

      error.status = response.status;

      error.code = "ZOHO_AUTH_FAILED";
      error.zohoError = data?.error || null;
      error.httpStatus = 502;

      throw error;
    }

    state.authFailureUntil = 0;

    const expiresInSeconds = Math.max(60, Number(data.expires_in) || 3600);

    state.accessToken = data.access_token;

    state.accessTokenExpiresAt = Date.now() + expiresInSeconds * 1000;

    state.apiDomain = String(data.api_domain || getDefaultApiUrl()).replace(
      /\/+$/,
      "",
    );

    return {
      accessToken: state.accessToken,

      expiresAt: state.accessTokenExpiresAt,

      apiDomain: state.apiDomain,
    };
  })()
    .catch((error) => {
      clearAccessToken();
      throw error;
    })
    .finally(() => {
      state.refreshPromise = null;
    });

  return state.refreshPromise;
}

export async function getZohoAccessToken(forceRefresh = false) {
  if (!forceRefresh && hasValidAccessToken()) {
    return {
      accessToken: state.accessToken,

      expiresAt: state.accessTokenExpiresAt,

      apiDomain: state.apiDomain || getDefaultApiUrl(),
    };
  }

  return refreshZohoAccessToken();
}

function getTimeoutSignal(existingSignal, timeoutMs) {
  if (existingSignal) {
    return existingSignal;
  }

  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.timeout(timeoutMs);
  }

  return undefined;
}

export async function zohoFetch(url, options = {}, retryCount = 0) {
  const tokenInfo = await getZohoAccessToken();

  const headers = {
    ...(options.headers || {}),

    Authorization: `Zoho-oauthtoken ${tokenInfo.accessToken}`,

    Accept: "application/json",
  };

  const response = await fetch(url, {
    ...options,

    headers,

    signal: getTimeoutSignal(
      options.signal, DEFAULT_TIMEOUT_MS,
    ),

    cache: "no-store",
  });

  if (response.status === 401 && retryCount < MAX_AUTH_RETRIES) {
    if (state.accessToken === tokenInfo.accessToken) {
      clearAccessToken();
    }

    await getZohoAccessToken(true);

    return zohoFetch(url, options, retryCount + 1);
  }

  return response;
}

export function getZohoAuthStatus() {
  return {
    hasAccessToken: Boolean(state.accessToken),

    expiresAt: state.accessTokenExpiresAt
      ? new Date(state.accessTokenExpiresAt).toISOString()
      : null,

    isValid: hasValidAccessToken(),

    refreshInProgress: Boolean(state.refreshPromise),

    apiDomain: state.apiDomain || getDefaultApiUrl(),
  };
}

export function resetZohoAuth() {
  clearAccessToken();
  state.refreshPromise = null;
}
