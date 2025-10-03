import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { api } from '../api';

function ConfirmDialog({ open, title = 'Confirm', message, onCancel, onConfirm, loading = false }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
        <p style={{ margin: 0 }}>{message}</p>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" onClick={onCancel} disabled={loading}>Cancel</button>
          <button onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function Dashboard() {
const nav = useNavigate();
const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
const token = localStorage.getItem('token');

// who am I?
const meId = (user && user.id) ? String(user.id) : '';

// helper: works whether t.owner is populated ({ _id, name }) or just an id string
const isOwnerOf = (task) => String(task.owner?._id || task.owner) === meId;


const isAdmin = (user?.role === 'admin');
const [adminUsers, setAdminUsers] = useState([]);
const [actorProtected, setActorProtected] = useState(false);
const [roleBusy, setRoleBusy] = useState({}); // { [userId]: true }

const loadAdminUsers = async () => {
  setErr('');
  try {
    const data = await api.adminListUsers(token);
    // data = { actorProtected, users: [...] }
    setActorProtected(!!data.actorProtected);
    setAdminUsers(data.users || []);
  } catch (e) {
    setErr(e.message);
  }
};


// sidebar tab
const [activeTab, setActiveTab] = useState('create'); // 'create' | 'tasks'

const goTab = (tab) => {
  setActiveTab(tab);
  if (tab === 'tasks') load();
  if (tab === 'admin') loadAdminUsers();
};

// tasks state
const [tasks, setTasks] = useState([]);
const [filter, setFilter] = useState('all'); // all | pending | completed
const [loading, setLoading] = useState(false);
const [err, setErr] = useState('');

// create form
const [users, setUsers] = useState([]);
const userOptions = users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }));

// form state (include sharedWithIds)
const [form, setForm] = useState({
title: '',
description: '',
dueDate: '',
status: 'pending',
sharedWithIds: []   // <-- array of user IDs
});

const [confirmOpen, setConfirmOpen] = useState(false);
const [confirmLoading, setConfirmLoading] = useState(false);
const [confirmMeta, setConfirmMeta] = useState({ type: 'task', id: null, text: '' });

const askDeleteTask = (id) => {
  setConfirmMeta({ type: 'task', id, text: 'Are you sure?' });
  setConfirmOpen(true);
};

const handleConfirm = async () => {
  if (!confirmOpen) return;
  setConfirmLoading(true);
  try {
    if (confirmMeta.type === 'task' && confirmMeta.id) {
      await api.deleteTask(confirmMeta.id, token);
      await load();
    }
    setConfirmOpen(false);
  } catch (e) {
    setErr(e.message);
  } finally {
    setConfirmLoading(false);
  }
};


// load users when Create tab is active (or once on mount)
useEffect(() => {
if (!token) return;
if (activeTab === 'create' && users.length === 0) {
  (async () => {
    try {
      const data = await api.listUsers('', token); // [{id,name,email}]
      setUsers(data);
    } catch (e) {
      setErr(e.message);
    }
  })();
}
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeTab, token]);

// inline edit
const [editingId, setEditingId] = useState(null);
const [edit, setEdit] = useState({
title: '',
description: '',
dueDate: '',
status: 'pending',
sharedWithIds: []
});

const logout = () => {
localStorage.removeItem('token');
localStorage.removeItem('user');
nav('/login');
};

const load = async (f = filter) => {
setLoading(true);
setErr('');
try {
  const data = await api.listTasks(f, token);
  setTasks(data);
} catch (e) {
  setErr(e.message);
} finally {
  setLoading(false);
}
};

useEffect(() => {
if (!token) return;
(async () => {
  try {
    const data = await api.listUsers('', token); // [{id, name, email}]
    setUsers(data);
  } catch (e) {
    // optional: setErr(e.message);
  }
})();
}, [token]);

useEffect(() => {
  if (!token) { nav('/login'); return; }
  if (activeTab === 'tasks') load(filter);
}, [activeTab, filter, token]);

const onCreate = async (e) => {
e.preventDefault();
setErr('');
try {
  const sharedWithEmails = (form.assignees || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const payload = {
    title: form.title.trim(),
    description: form.description?.trim() || undefined,
    dueDate: form.dueDate || undefined,
    status: form.status,
    ...(form.sharedWithIds.length ? { sharedWithIds: form.sharedWithIds } : {}),
  };
  if (!payload.title) throw new Error('Title is required');

  await api.createTask(payload, token);
      setForm({ title: '', description: '', dueDate: '', status: 'pending', sharedWithIds: [] });
      goTab('tasks'); // will also call load()
} catch (e) {
  setErr(e.message);
}
};


const startEdit = (t) => {
setEditingId(t._id);
setEdit({
  title: t.title,
  description: t.description || '',
  dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '',
  status: t.status,
  sharedWithIds: (t.sharedWith || []).map(u => (u._id || u)).map(String),
});
};

const cancelEdit = () => {
setEditingId(null);
setEdit({ title: '', description: '', dueDate: '', status: 'pending', sharedWithIds: [] });
};

const saveEdit = async (id) => {
setErr('');
try {
  const payload = {
    title: edit.title.trim(),
    description: edit.description.trim(),
    dueDate: edit.dueDate || undefined,
    status: edit.status,
    sharedWithIds: edit.sharedWithIds, // <-- replace assignees
  };
  await api.updateTask(id, payload, token);
  setEditingId(null);
  await load();
} catch (e) {
  setErr(e.message);
}
};


const toggle = async (t) => {
try {
  await api.toggleTask(t._id, t.status, token);
  await load();
} catch (e) {
  setErr(e.message);
}
};

const remove = async (id) => {
if (!confirm('Delete this task?')) return;
try {
  await api.deleteTask(id, token);
  await load();
} catch (e) {
  setErr(e.message);
}
};

return (
<div className={`dashboard_outer ${activeTab === 'admin' && isAdmin ? 'admin-mode' : ''}`}>
  <header className="dash-header">
    <h1 className="dash-title">Task Management</h1>
    <div>
      <span style={{ marginRight: 12 }}>Hi, <b>{user?.name || 'User'}</b></span>
      <button onClick={logout}>Logout</button>
    </div>
  </header>

  <div className="dash-layout">
    {/* Sidebar */}
    <aside className="dash-sidebar">
      <button
        className={`dash-tab ${activeTab === 'create' ? 'active' : ''}`}
        onClick={() => goTab('create')}
      >
        Create Task
      </button>
      <button
        className={`dash-tab ${activeTab === 'tasks' ? 'active' : ''}`}
        onClick={() => goTab('tasks')}
      >
        Tasks
      </button>
      {isAdmin && (
  <button
    className={`dash-tab ${activeTab === 'admin' ? 'active' : ''}`}
    onClick={() => goTab('admin')}
  >
    Admin
  </button>
)}
    </aside>

    {/* Main content */}
    <main className="dash-content">
      {err && <p className="error" style={{ marginBottom: 12 }}>{err}</p>}

      {activeTab === 'create' && (
        <section>
          <h2>Create Task</h2>
          <form onSubmit={onCreate}>
            <label>Title
              <input
                name="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>

            <label>Description
              <input
                name="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="optional"
              />
            </label>

            <div className="row">
              <label>Due Date
                <input
                  type="date"
                  name="dueDate"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </label>
              <label>Assign to
<div style={{ width: '100%' }}>
  <Select
    isMulti
    options={userOptions}
    value={userOptions.filter(o => form.sharedWithIds.includes(o.value))}
    onChange={(selected) =>
      setForm({ ...form, sharedWithIds: (selected || []).map(o => o.value) })
    }
    placeholder="Select users..."
    closeMenuOnSelect={false}
    className="rs-container"
    classNamePrefix="rs"
  />
</div>
</label>
              <label>Status
                <div className="task-status-parent">
                <select
                  name="status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
                </div>
              </label>
            </div>

            <div style={{ marginTop: 8 }}>
              <button type="submit">Create</button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'tasks' && (
        <section>
          <div className="tasks-header">
            <h2>Tasks</h2>
            <div style={{width: '180px'}}>
              <label style={{ marginRight: 8 }}>Filter:</label>
              <div className="task-status-parent">
              <select className='filter-task-staus' value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="pending">Only Pending</option>
                <option value="completed">Only Completed</option>
              </select>
              </div>
            </div>
          </div>

          {loading ? (
            <p>Loading…</p>
          ) : tasks.length === 0 ? (
            <p>No tasks yet.</p>
          ) : (
            <ul className="task-list">
              {tasks.map((t) => (
                <li key={t._id} className="task-card">
                  {editingId === t._id ? (
                    <div>
                      <input
                        value={edit.title}
                        onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                        style={{ width: '100%', marginBottom: 8 }}
                      />
                      <input
                        value={edit.description}
                        onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                        style={{ width: '100%', marginBottom: 8 }}
                        placeholder="description"
                      />
                      {/* Assignees dropdown */}
                      <div style={{ margin: '0 0 8px' }}>
                        {/* <label>Assignees</label> */}
                        <Select
                          isMulti
                          options={userOptions}
                          value={userOptions.filter(o => edit.sharedWithIds.includes(o.value))}
                          onChange={(selected) =>
                            setEdit({ ...edit, sharedWithIds: (selected || []).map(o => o.value) })
                          }
                          placeholder="Select users..."
                          closeMenuOnSelect={false}
                          className="rs-container"
                          classNamePrefix="rs"
                        />
                      </div>
                      <div className="row">
                        {/* <label >Due Date</label> */}
                        <input
                          type="date"
                          value={edit.dueDate}
                          onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })}
                        /> 
                        <div className="task-status-parent">
                        <select className="task-status"
                          value={edit.status}
                          onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                        </select>
                        </div>
                      </div>
                      <div className="row">
                        <button onClick={() => saveEdit(t._id)}>Save</button>
                        <button type="button" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="task-head">
                        <div>
                          <strong>{t.title}</strong>
                          <div className="task-sub">
                            {t.status.toUpperCase()}
                            {t.dueDate ? ' • due ' + new Date(t.dueDate).toLocaleDateString() : ''}
                          </div>

                          {/* Insert the Shared-with block RIGHT HERE */}
                          {t.sharedWith?.length ? (
                            <div className="task-sub">
                              Shared with: {t.sharedWith.map(u => u.name || u.email).join(', ')}
                            </div>
                          ) : null}
                        </div>

                        <div className="row">
                          <button onClick={() => toggle(t)}>
                            {t.status === 'completed' ? 'Mark Pending' : 'Mark Completed'}
                          </button>
                          {isOwnerOf(t) && (
                            <>
                              <button onClick={() => startEdit(t)}>Edit</button>
                              <button onClick={() => askDeleteTask(t._id)}>Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                      {t.description && <div style={{ marginTop: 8, padding: 10, borderRadius: 8, border: '1px solid #ccc' }}><p>{t.description}</p></div>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'admin' && isAdmin && (
  <section>
    <h2>Admin — Users & Roles</h2>
    <div style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            <th style={{textAlign:'left'}}>Name</th>
            <th style={{textAlign:'left'}}>Email</th>
            <th style={{textAlign:'left'}}>Role</th>
            <th>Protected</th>
            <th style={{textAlign:'right'}}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {adminUsers.map(u => {
            const disabled = u.protected && !actorProtected; // new admins cannot change protected ones
            return (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td className='task-status-parent'>
                  <select className='filter-task-staus'
                    value={u.role}
                    onChange={e => setAdminUsers(prev =>
                      prev.map(x => x.id === u.id ? { ...x, role: e.target.value } : x)
                    )}
                    disabled={disabled || roleBusy[u.id]}
                  >
                    <option value="user">user</option>
                    <option value="manager">manager</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td style={{textAlign:'center'}}>
                  {u.protected ? '✅' : '—'}
                </td>
                <td style={{textAlign:'right'}}>
                  <button
                    disabled={disabled || roleBusy[u.id]}
                    onClick={async () => {
                      try {
                        setRoleBusy(prev => ({ ...prev, [u.id]: true }));
                        await api.adminSetUserRole(u.id, u.role, token);
                        await loadAdminUsers(); // refresh from server truth
                      } catch (e) {
                        setErr(e.message);
                      } finally {
                        setRoleBusy(prev => ({ ...prev, [u.id]: false }));
                      }
                    }}
                  >
                    Save
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </section>
)}

<ConfirmDialog
  open={confirmOpen}
  title="Confirm Deletion"
  message={confirmMeta.text}
  loading={confirmLoading}
  onCancel={() => setConfirmOpen(false)}
  onConfirm={handleConfirm}
/>

    </main>
  </div>
</div>

);
}

