export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('mastery_token');
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Merge headers if provided
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((val, key) => {
        headers[key] = val;
      });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([key, val]) => {
        headers[key] = val;
      });
    } else {
      Object.assign(headers, init.headers);
    }
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });
}
