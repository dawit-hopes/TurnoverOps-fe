const TOKEN_KEY = "turnoverops.token";

export function apiBase() {
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
}

export function authToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = authToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiBase()}${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as { error?: { code?: string; message?: string } }) : null;
  if (!response.ok) {
    const code = payload?.error?.code || "request_failed";
    const message = payload?.error?.message || response.statusText || "Request failed";
    throw new ApiError(response.status, code, message);
  }
  return payload as T;
}

export async function fetchAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;
  const limit = 200;
  for (;;) {
    const joiner = path.includes("?") ? "&" : "?";
    const page = await request<Page<T>>(`${path}${joiner}limit=${limit}&offset=${offset}`);
    items.push(...page.items);
    if (items.length >= page.total || page.items.length === 0) break;
    offset += page.items.length;
  }
  return items;
}
