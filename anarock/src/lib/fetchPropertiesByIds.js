// Loads only the properties whose IDs are given, instead of the whole
// inventory. /api/properties?ids= accepts up to 10 IDs per call, so longer
// lists are split into several calls.
const IDS_PER_REQUEST = 10;

export async function fetchPropertiesByIds(ids, options = {}) {
  const uniqueIds = [
    ...new Set(
      (Array.isArray(ids) ? ids : [])
        .map((id) => String(id ?? "").trim())
        .filter(Boolean),
    ),
  ];

  if (!uniqueIds.length) return [];

  const chunks = [];
  for (let index = 0; index < uniqueIds.length; index += IDS_PER_REQUEST) {
    chunks.push(uniqueIds.slice(index, index + IDS_PER_REQUEST));
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const params = new URLSearchParams({ ids: chunk.join(",") });
      const response = await fetch(`/api/properties?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: options.signal,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success || !Array.isArray(data?.data)) {
        throw new Error(
          data?.error || data?.message || "Unable to load properties.",
        );
      }

      return data.data;
    }),
  );

  return results.flat();
}
