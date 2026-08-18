export class ApiError extends Error {
  status: number;
  issues?: unknown;
  // Stable machine-readable code from handleApiError's response shape
  // (e.g. "email_taken", "invalid_token") — optional because a network
  // failure or a non-JSON response never has one. `message` is untouched
  // and still carries the server's English text; this is purely additive
  // so callers that only ever read `.message` keep working exactly as
  // before. Added for M6.6 Increment 3B, which will map this code to a
  // translation key on the client instead of rendering `.message`
  // directly — not consumed anywhere yet.
  code?: string;

  constructor(status: number, message: string, issues?: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
    this.code = code;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.message ?? "Request failed",
      data?.issues,
      data?.error,
    );
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
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
