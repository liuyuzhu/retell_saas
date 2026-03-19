/**
 * Global API fetch utility with automatic auth token injection
 */

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

/**
 * Wrapped fetch that automatically adds Authorization header
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Also include credentials for cookie fallback
  const finalInit: RequestInit = {
    ...init,
    headers,
    credentials: 'include',
  };
  
  return fetch(input, finalInit);
}
