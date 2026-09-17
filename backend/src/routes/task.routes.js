const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const STATUSES = ['todo', 'in-progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

// Every task route needs a signed-in user
router.use(requireAuth);

/** Sends a change to every device this user has open. */
function broadcast(req, event, payload) {
  req.app.get('io').to(`user:${req.user.id}`).emit(event, payload);
}

function getOwnedTask(id, userId) {
  return db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
}

function validate(body, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || body.title !== undefined) {
    const title = (body.title || '').trim();
    if (title.length < 1) errors.push('Task needs a title');
    else if (title.length > 120) errors.push('Keep the title under 120 characters');
    else data.title = title;
  }

  if (body.description !== undefined) data.description = String(body.description || '').trim();

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) errors.push('Status must be todo, in-progress or done');
    else data.status = body.status;
  }

  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) errors.push('Priority must be low, medium or high');
    else data.priority = body.priority;
  }

  if (body.due_date !== undefined) {
    const value = (body.due_date || '').trim();
    if (value === '') data.due_date = null;
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push('Due date must look like 2026-09-18');
    else data.due_date = value;
  }

  if (body.reminder_at !== undefined) {
    const value = (body.reminder_at || '').trim();
    if (value === '') data.reminder_at = null;
    else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
      errors.push('Reminder must include a date and time');
    } else data.reminder_at = value;
  }

  return { data, errors };
}

// GET /api/tasks?status=todo&priority=high&q=report
router.get('/', (req, res) => {
  const clauses = ['user_id = ?'];
  const params = [req.user.id];

  if (req.query.status && STATUSES.includes(req.query.status)) {
    clauses.push('status = ?');
    params.push(req.query.status);
  }
  if (req.query.priority && PRIORITIES.includes(req.query.priority)) {
    clauses.push('priority = ?');
    params.push(req.query.priority);
  }
  if (req.query.q) {
    clauses.push('(title LIKE ? OR description LIKE ?)');
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }

  const tasks = db
    .prepare(`SELECT * FROM tasks WHERE ${clauses.join(' AND ')} ORDER BY datetime(created_at) DESC`)
    .all(...params);

  res.json({ tasks });
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const task = getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ task });
});

// POST /api/tasks
router.post('/', (req, res) => {
  const { data, errors } = validate(req.body);
  if (errors.length) return res.status(400).json({ error: errors[0], errors });

  const info = db
    .prepare(
      `INSERT INTO tasks (user_id, title, description, status, priority, due_date, reminder_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      data.title,
      data.description || '',
      data.status || 'todo',
      data.priority || 'medium',
      data.due_date || null,
      data.reminder_at || null
    );

  const task = getOwnedTask(info.lastInsertRowid, req.user.id);
  broadcast(req, 'task:created', task);
  res.status(201).json({ task });
});

// PUT /api/tasks/:id  — full or partial update
router.put('/:id', (req, res) => {
  const existing = getOwnedTask(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const { data, errors } = validate(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors[0], errors });

  const fields = Object.keys(data);
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  const setters = fields.map((f) => `${f} = ?`).join(', ');
  db.prepare(`UPDATE tasks SET ${setters}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
    .run(...fields.map((f) => data[f]), req.params.id, req.user.id);

  const task = getOwnedTask(req.params.id, req.user.id);
  broadcast(req, 'task:updated', task);
  res.json({ task });
});

// PATCH /api/tasks/:id/status — used when a card is moved between columns
router.patch('/:id/status', (req, res) => {
  if (!STATUSES.includes(req.body.status)) {
    return res.status(400).json({ error: 'Status must be todo, in-progress or done' });
  }
  const existing = getOwnedTask(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  db.prepare(`UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
    .run(req.body.status, req.params.id, req.user.id);

  const task = getOwnedTask(req.params.id, req.user.id);
  broadcast(req, 'task:updated', task);
  res.json({ task });
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const existing = getOwnedTask(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  broadcast(req, 'task:deleted', { id: Number(req.params.id) });
  res.json({ deleted: Number(req.params.id) });
});

module.exports = router;
