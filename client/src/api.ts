import type { User } from './types';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const base = import.meta.env.VITE_API_URL || '/api';
let token: string | undefined;
let refreshPromise: Promise<{ user: User; accessToken: string }> | undefined;
export function setToken(value?: string) {
  token = value;
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const data: { error?: { message?: string } } = await response.json().catch(() => {
    throw new ApiError(
      response.ok ? 502 : response.status,
      'The booking server is unavailable or returned an invalid response. Wait for the backend to start, then try again.',
    );
  });
  if (!response.ok) throw new ApiError(response.status, data.error?.message || 'Request failed');
  return data as T;
}
export async function refresh() {
  refreshPromise ??= request<{ user: User; accessToken: string }>('/auth/refresh', {
    method: 'POST',
  })
    .then((data) => {
      setToken(data.accessToken);
      return data;
    })
    .finally(() => {
      refreshPromise = undefined;
    });
  return refreshPromise;
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && !path.startsWith('/auth/')) {
      await refresh();
      return request<T>(path, options);
    }
    throw error;
  }
}
export const body = (data: unknown) => JSON.stringify(data);
