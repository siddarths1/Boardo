/* eslint-disable @next/next/no-location-assign-relative-destination -- Authentication transitions require a full reload to clear cached private route state. */
function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason); return; }
    const abort = () => { clearTimeout(timer); reject(signal?.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}
export async function request<T>(url: string, method = "GET", data?: unknown, signal?: AbortSignal): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { method, signal, cache: "no-store", ...(data !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}) });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401 && !url.includes("/auth/")) { window.location.assign("/login"); throw new Error("Please sign in."); }
    // Only repeat reads with explicitly temporary failures; writes may already have committed.
    if (method === "GET" && [502, 503, 504].includes(response.status) && attempt < 2) {
      await delay(500 * 2 ** attempt + Math.random() * 250, signal);
      continue;
    }
    if (!response.ok) throw new Error((result.error || "Could not complete this request. Please retry.") + (result.reference ? " Reference: " + result.reference : ""));
    return result as T;
  }
}
