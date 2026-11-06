export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  url: string,
  body?: object,
  method = "POST",
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    method: body !== undefined || method === "DELETE" ? method : "GET",
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000),
  });
  if (response.status === 401 && url !== "/api/login" && url !== "/api/session")
    window.dispatchEvent(new Event("annu:unauthorized"));
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.error || "Request failed. Please try again.",
      response.status,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
