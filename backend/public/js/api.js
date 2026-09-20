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

// The frontend can be served two different ways:
//  - From Render itself (backend serves this same public/ folder), where
//    a relative path is correct because the API lives on the same origin.
//  - From Netlify, which only hosts static files with no backend at all,
//    so relative paths would hit Netlify and 404. In that case we need
//    the real Render backend URL instead.
// Localhost is always treated as "same origin" for local development.
const RENDER_BACKEND_URL = 'https://task-management-application-nbw0.onrender.com';
const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const isRenderItself = location.hostname.endsWith('.onrender.com');
const API_BASE_URL = (isLocal || isRenderItself) ? '' : RENDER_BACKEND_URL;

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (Auth.token) headers.Authorization = `Bearer ${Auth.token}`;

  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data = {};
  try { data = await res.json(); } catch (e) {}

  if (res.status === 401 && location.pathname !== '/index.html' && location.pathname !== '/') {
    Auth.clear();
    location.href = '/index.html';
    return;
  }

  if (!res.ok) throw new Error(data.error || 'Request failed');

  return data;
}