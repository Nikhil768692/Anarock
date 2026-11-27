// Small helpers shared by the tests.
export function makeRequest(body, headers = {}, url = "http://localhost:3000/api/test") {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// Replaces global fetch for one test. `handler(url, init)` returns a Response
// or undefined (then the call fails, so unexpected calls are noticed).
export function mockFetch(t, handler) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    calls.push({ url, init });
    const response = await handler(url, init);
    if (!response) throw new Error(`Unexpected fetch: ${url}`);
    return response;
  };
  t.after(() => {
    globalThis.fetch = original;
  });
  return calls;
}

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
