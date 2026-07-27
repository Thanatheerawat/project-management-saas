export class ApiError extends Error {
  status: number;
  issues?: unknown;

  constructor(status: number, message: string, issues?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? "Request failed", data?.issues);
  }

  return data as T;
}

// Thin fetch wrapper so every TanStack Query hook throws the same
// ApiError shape instead of each one handling fetch/response parsing
// itself.
export const apiClient = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
};
