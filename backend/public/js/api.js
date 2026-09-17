/* Shared helpers: token storage and fetch wrapper. */
const Auth = {
  get token() { return localStorage.getItem('tm_token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('tm_user')); } catch (e) { return null; }
  },
  save(token, user) {
    localStorage.setItem('tm_token', token);
    localStorage.setItem('tm_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_user');
  }
};

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (Auth.token) headers.Authorization = `Bearer ${Auth.token}`;

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = {};
  try { data = await res.json(); } catch (e) { /* empty body */ }

  if (res.status === 401 && location.pathname !== '/index.html' && location.pathname !== '/') {
    Auth.clear();
    location.href = '/index.html';
    return;
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
