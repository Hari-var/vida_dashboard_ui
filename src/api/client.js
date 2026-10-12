import { getInitialBaseUrl } from "../config.js";

let _baseUrl = getInitialBaseUrl();

export function setClientBaseUrl(url) { _baseUrl = url; }
export function getClientBaseUrl() { return _baseUrl; }

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

const STATUS_MESSAGES = {
  400: "Bad request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not found",
  409: "Conflict",
  422: "Validation error",
  429: "Too many requests",
  500: "Server error",
};

export async function apiFetch(path, options = {}) {
  const url = `${_baseUrl}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    let detail = STATUS_MESSAGES[res.status] || `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((e) => e.msg).join("; ");
    } catch { /* non-JSON */ }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path, signal) => apiFetch(path, { method: "GET", signal }),
  post: (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) => apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: "DELETE" }),
};
