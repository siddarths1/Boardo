/* eslint-disable @next/next/no-location-assign-relative-destination -- Authentication transitions require a full reload to clear cached private route state. */
export async function request<T>(url: string, method = "GET", data?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method, signal, cache: "no-store", ...(data !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}) });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401 && !url.includes("/auth/")) { window.location.assign("/login"); throw new Error("Please sign in."); }
  if (!response.ok) throw new Error(result.error || "Could not save. Please retry.");
  return result as T;
}
