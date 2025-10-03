const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
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
