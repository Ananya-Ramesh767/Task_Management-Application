/* Task board: loads tasks, handles CRUD, and listens for live updates. */
if (!Auth.token) location.href = '/index.html';

const COLUMNS = [
  { key: 'todo', label: 'To do' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'done', label: 'Done' }
];
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

let tasks = [];

const board = document.getElementById('board');
const dialog = document.getElementById('taskDialog');
const taskForm = document.getElementById('taskForm');
const dialogTitle = document.getElementById('dialogTitle');
const dialogNotice = document.getElementById('dialogNotice');
const search = document.getElementById('search');
const filterPriority = document.getElementById('filterPriority');
const sortBy = document.getElementById('sortBy');
const toast = document.getElementById('toast');
const liveDot = document.getElementById('liveDot');
const reminderBtn = document.getElementById('reminderBtn');
const reminderTimers = new Set();

/* ---------- helpers ---------- */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatReminder(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value.replace('T', ' ') : d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'
  });
}

function isOverdue(task) {
  if (!task.due_date || task.status === 'done') return false;
  const today = new Date().toISOString().slice(0, 10);
  return task.due_date < today;
}

/* ---------- rendering ---------- */
function visibleTasks() {
  const q = search.value.trim().toLowerCase();
  const priority = filterPriority.value;

  let list = tasks.filter((t) => {
    const matchesText = !q ||
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q);
    const matchesPriority = !priority || t.priority === priority;
    return matchesText && matchesPriority;
  });

  if (sortBy.value === 'priority') {
    list.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  } else if (sortBy.value === 'due') {
    list.sort((a, b) => (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31'));
  } else {
    list.sort((a, b) => b.id - a.id);
  }
  return list;
}

function taskCard(task) {
  const overdue = isOverdue(task);
  const due = task.due_date
    ? `<span class="chip ${overdue ? 'overdue' : ''}">${overdue ? 'Overdue ' : 'Due '}${formatDate(task.due_date)}</span>`
    : '';
  const reminder = task.reminder_at && task.status !== 'done'
    ? `<span class="chip reminder">Reminder ${formatReminder(task.reminder_at)}</span>`
    : '';

  return `
    <article class="task p-${task.priority} ${task.status === 'done' ? 'done' : ''}" data-id="${task.id}">
      <h3>${escapeHtml(task.title)}</h3>
      ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
      <div class="meta">
        <span class="chip ${task.priority}">${task.priority} priority</span>
        ${due}
        ${reminder}
      </div>
      <div class="task-actions">
        <select data-action="move" aria-label="Change stage">
          ${COLUMNS.map((c) => `<option value="${c.key}" ${c.key === task.status ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" data-action="edit">Edit</button>
        <button class="btn btn-danger btn-sm" data-action="delete">Delete</button>
      </div>
    </article>`;
}

function render() {
  const list = visibleTasks();

  board.innerHTML = COLUMNS.map((col) => {
    const items = list.filter((t) => t.status === col.key);
    const body = items.length
      ? items.map(taskCard).join('')
      : `<div class="empty">Nothing here yet</div>`;
    return `
      <section class="column">
        <div class="column-head">
          <h2>${col.label}</h2>
          <span class="count">${items.length}</span>
        </div>
        <div class="column-body">${body}</div>
      </section>`;
  }).join('');

  const open = tasks.filter((t) => t.status !== 'done').length;
  document.getElementById('summary').textContent = tasks.length
    ? `${tasks.length} task${tasks.length === 1 ? '' : 's'} · ${open} still open`
    : 'No tasks yet. Add your first one.';
}

/* ---------- data ---------- */
function upsert(task) {
  const i = tasks.findIndex((t) => t.id === task.id);
  if (i === -1) tasks.push(task); else tasks[i] = task;
  render();
}

async function loadTasks() {
  try {
    const data = await api('/tasks');
    tasks = data.tasks;
    render();
  } catch (err) {
    showToast(err.message);
  }
}

/* ---------- dialog ---------- */
function openDialog(task) {
  dialogNotice.className = 'notice';
  taskForm.reset();
  document.getElementById('taskId').value = task ? task.id : '';
  dialogTitle.textContent = task ? 'Edit task' : 'Add task';

  if (task) {
    document.getElementById('title').value = task.title;
    document.getElementById('description').value = task.description || '';
    document.getElementById('status').value = task.status;
    document.getElementById('priority').value = task.priority;
    document.getElementById('dueDate').value = task.due_date || '';
    document.getElementById('reminderAt').value = task.reminder_at || '';
  } else {
    document.getElementById('priority').value = 'medium';
  }

  dialog.showModal();
  document.getElementById('title').focus();
}

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('taskId').value;
  const body = {
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    status: document.getElementById('status').value,
    priority: document.getElementById('priority').value,
    due_date: document.getElementById('dueDate').value
    ,reminder_at: document.getElementById('reminderAt').value
  };

  try {
    const data = id
      ? await api(`/tasks/${id}`, { method: 'PUT', body })
      : await api('/tasks', { method: 'POST', body });
    upsert(data.task);
    dialog.close();
    showToast(id ? 'Task updated' : 'Task added');
  } catch (err) {
    dialogNotice.textContent = err.message;
    dialogNotice.className = 'notice error';
  }
});

document.getElementById('cancelBtn').addEventListener('click', () => dialog.close());
document.getElementById('newTaskBtn').addEventListener('click', () => openDialog(null));

/* ---------- board interactions ---------- */
board.addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const id = Number(button.closest('.task').dataset.id);
  const task = tasks.find((t) => t.id === id);

  if (button.dataset.action === 'edit') {
    openDialog(task);
  } else if (button.dataset.action === 'delete') {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await api(`/tasks/${id}`, { method: 'DELETE' });
      tasks = tasks.filter((t) => t.id !== id);
      render();
      showToast('Task deleted');
    } catch (err) {
      showToast(err.message);
    }
  }
});

board.addEventListener('change', async (e) => {
  const select = e.target.closest('select[data-action="move"]');
  if (!select) return;
  const id = Number(select.closest('.task').dataset.id);
  try {
    const data = await api(`/tasks/${id}/status`, { method: 'PATCH', body: { status: select.value } });
    upsert(data.task);
    showToast('Stage updated');
  } catch (err) {
    showToast(err.message);
    render();
  }
});

[search, filterPriority, sortBy].forEach((el) => el.addEventListener('input', render));

/* ---------- reminders ---------- */
function checkReminders() {
  const now = Date.now();
  tasks.forEach((task) => {
    if (!task.reminder_at || task.status === 'done' || reminderTimers.has(task.id)) return;
    const reminderTime = new Date(task.reminder_at).getTime();
    if (Number.isNaN(reminderTime) || reminderTime > now || now - reminderTime > 60000) return;

    reminderTimers.add(task.id);
    showToast(`Reminder: ${task.title}`);
    if (Notification.permission === 'granted') {
      new Notification('Task reminder', { body: task.title, tag: `task-${task.id}` });
    }
  });
}

reminderBtn.addEventListener('click', async () => {
  if (!('Notification' in window)) {
    showToast('Browser notifications are not supported here');
    return;
  }
  const permission = await Notification.requestPermission();
  reminderBtn.textContent = permission === 'granted' ? 'Reminders on' : 'Enable reminders';
  showToast(permission === 'granted' ? 'Reminders enabled' : 'Reminders remain off');
});

if ('Notification' in window && Notification.permission === 'granted') reminderBtn.textContent = 'Reminders on';
setInterval(checkReminders, 15000);
checkReminders();

/* ---------- session ---------- */
document.getElementById('logoutBtn').addEventListener('click', () => {
  Auth.clear();
  location.href = '/index.html';
});

const user = Auth.user;
if (user) {
  document.getElementById('who').textContent = user.email;
  document.getElementById('greeting').textContent = `${user.name.split(' ')[0]}'s board`;
}

/* ---------- real-time updates ---------- */
const socket = io('https://task-management-application-nbw0.onrender.com', {
  auth: { token: Auth.token }
});
socket.on('connect', () => {
  liveDot.classList.add('on');
  liveDot.querySelector('span').textContent = 'Live';
});
socket.on('disconnect', () => {
  liveDot.classList.remove('on');
  liveDot.querySelector('span').textContent = 'Offline';
});
socket.on('task:created', upsert);
socket.on('task:updated', upsert);
socket.on('task:deleted', ({ id }) => {
  tasks = tasks.filter((t) => t.id !== id);
  render();
});

loadTasks();
