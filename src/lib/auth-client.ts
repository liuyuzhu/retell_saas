/**
 * Auth utilities for client-side
 */

// Get token from localStorage
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

// Get user from localStorage
export function getAuthUser<T = { id: string; email: string; name: string | null; role: string }>(): T | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('auth_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Check if user is logged in (from localStorage)
export function isLoggedIn(): boolean {
  return Boolean(getAuthUser() && getAuthToken());
}

// Clear auth data
export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_user');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_timestamp');
}

// Fetch with auth token
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}
