/** Bound each serverless process instead of opening a CPU-sized connection pool. */
export function databaseUrl(value: string | undefined) {
  if (!value) return value;
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) return value;
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "1");
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "15");
  if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "10");
  return url.toString();
}
