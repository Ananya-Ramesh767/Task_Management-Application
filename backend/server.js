require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { initDb } = require('./src/db');
const { verifyToken } = require('./src/middleware/auth');
const authRoutes = require('./src/routes/auth.routes');
const taskRoutes = require('./src/routes/task.routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 4000;

// Prepare the database (creates tables on first run)
initDb();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Make io available inside route handlers via req.app.get('io')
app.set('io', io);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Unknown API route
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Anything else falls back to the login page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

/**
 * Real-time layer.
 * Each socket authenticates with the same JWT the REST API uses,
 * then joins a private room so a user only receives their own task events.
 */
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error('Missing token'));
  try {
    const payload = verifyToken(token);
    socket.userId = payload.id;
    next();
  } catch (e) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  socket.on('disconnect', () => {
    // nothing to clean up, rooms are released automatically
  });
});

server.listen(PORT, () => {
  console.log(`\n  Task Manager running at http://localhost:${PORT}\n`);
});
