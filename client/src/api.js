const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function request(path, { method='GET', body } = {}) {
  const token = localStorage.getItem('token'); // set this after /login
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const api = {
  register: (payload) => request('/register', { method: 'POST', body: payload }),
  login:    (payload) => request('/login',    { method: 'POST', body: payload }),
  listUsers: (q, token) => request(`/users${q ? `?q=${encodeURIComponent(q)}` : ''}`, { token }),
  createTask: (payload, token) => request('/tasks', { method: 'POST', body: payload, token }),
  listTasks:  (filter = 'all', token) => request(`/tasks?filter=${encodeURIComponent(filter)}`, { token }),
  getTask:    (id, token) => request(`/tasks/${id}`, { token }),
  updateTask: (id, payload, token) => request(`/tasks/${id}`, { method: 'PATCH', body: payload, token }),
  deleteTask: (id, token) => request(`/tasks/${id}`, { method: 'DELETE', token }),
  toggleTask: (id, currentStatus, token) =>
    request(`/tasks/${id}`, { method: 'PATCH', body: { status: currentStatus === 'completed' ? 'pending' : 'completed' }, token }),
  adminListUsers: (token) => request('/admin/users', { token }),
  adminSetUserRole: (id, role, token) =>
    request(`/admin/users/${id}/role`, { method: 'PATCH', body: { role }, token }),
};

api.toggleTask = (id, currentStatus, token) =>
  api.updateTask(id, { status: currentStatus === 'completed' ? 'pending' : 'completed' }, token);

export { api };
