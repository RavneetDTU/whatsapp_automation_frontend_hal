const PRODUCTION_API = 'https://hal.jarvis.ayurvedicpromise.com';

function resolveBaseUrl(): string {
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  if (import.meta.env.DEV && !raw) return '';
  return raw || PRODUCTION_API;
}

const BASE_URL = resolveBaseUrl();

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export class ApiError extends Error {
  status: number;
  detail: string;
  errors?: Array<{ row?: number; phone?: string; error: string }>;
  constructor(
    status: number,
    detail: string,
    message?: string,
    errors?: Array<{ row?: number; phone?: string; error: string }>,
  ) {
    super(message ?? detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.errors = errors;
  }
}

function apiErrorFromBody(status: number, body: unknown): ApiError {
  const raw = (body as { detail?: unknown } | null)?.detail;
  if (typeof raw === 'string') return new ApiError(status, raw);
  if (raw && typeof raw === 'object') {
    const payload = raw as { message?: string; errors?: Array<{ row?: number; phone?: string; error: string }> };
    const message = payload.message || `HTTP ${status}`;
    return new ApiError(status, message, message, Array.isArray(payload.errors) ? payload.errors : undefined);
  }
  return new ApiError(status, `HTTP ${status}`);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = { detail: res.statusText };
  }

  if (!res.ok) {
    throw apiErrorFromBody(res.status, body);
  }

  return body as T;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function postForm<T>(path: string, body: FormData): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body,
  });
}

export function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}
