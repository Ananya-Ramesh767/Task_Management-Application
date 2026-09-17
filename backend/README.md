# Task Management Application

A full-stack task manager with account-based authentication, full CRUD on tasks, live updates over WebSockets, and a layout that works on phones and desktops.

**Stack:** Node.js + Express (REST API) · SQLite via better-sqlite3 · JWT + bcrypt auth · Socket.IO · vanilla HTML/CSS/JS frontend (no build step)

---

## Run it

You need Node.js 18 or newer (`node -v` to check).

```bash
cd task-manager
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm start
```

Open http://localhost:4000, create an account, and start adding tasks.

`npm run dev` restarts the server automatically when you edit a file.

To see real-time updates working: sign in, open the same URL in a second tab or on your phone (same Wi-Fi, use your machine's local IP), and add or move a task in one. The other updates immediately.

Edit `.env` and set `JWT_SECRET` to any long random string before showing this to anyone else.

---

## Folder layout

```
task-manager/
├── server.js                    Express app, static files, Socket.IO setup
├── package.json
├── .env.example                 copy to .env
├── src/
│   ├── db.js                    SQLite connection + table creation
│   ├── middleware/auth.js       JWT sign/verify + requireAuth guard
│   └── routes/
│       ├── auth.routes.js       register / login / me
│       └── task.routes.js       task CRUD + status change
├── public/
│   ├── index.html               sign in / create account
│   ├── app.html                 task board
│   ├── css/styles.css
│   └── js/
│       ├── api.js               token storage + fetch wrapper
│       ├── auth.js              login screen logic
│       └── app.js               board rendering, CRUD, socket events
└── data/tasks.db                created automatically on first run
```

---

## How the four requirements are met

**Authentication & authorization.** Passwords are hashed with bcrypt, never stored in plain text. Signing in returns a JWT that the browser sends on every request. `requireAuth` rejects requests without a valid token, and every task query is filtered by `user_id`, so one account can never read or change another account's tasks.

**CRUD operations.** Create, read, update and delete are all wired to the UI and validated on the server (title required, status and priority restricted to known values, due date checked for format).

**Real-time updates.** Each socket authenticates with the same JWT and joins a private room named after the user. When a task changes, the server emits `task:created`, `task:updated` or `task:deleted` to that room only, and every open tab of that user redraws.

**Responsive design.** Three columns on desktop collapse to a single stack under 900px, the split login screen becomes one column, and controls go full width on small phones.

---

## API reference

All task routes need the header `Authorization: Bearer <token>`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account. Body: `name`, `email`, `password` |
| POST | `/api/auth/login` | Sign in. Body: `email`, `password` |
| GET | `/api/auth/me` | Details of the signed-in account |
| GET | `/api/tasks` | List tasks. Optional query: `status`, `priority`, `q` |
| GET | `/api/tasks/:id` | One task |
| POST | `/api/tasks` | Create. Body: `title`, `description`, `status`, `priority`, `due_date` |
| PUT | `/api/tasks/:id` | Update any subset of those fields |
| PATCH | `/api/tasks/:id/status` | Move between stages. Body: `status` |
| DELETE | `/api/tasks/:id` | Delete |

`status` is `todo`, `in-progress` or `done`. `priority` is `low`, `medium` or `high`. `due_date` is `YYYY-MM-DD` or empty.

---

## Troubleshooting

- **`npm install` fails on better-sqlite3** — it compiles a native module. Update Node to an LTS version (18, 20 or 22) and retry. On Windows, installing the "Desktop development with C++" workload in Visual Studio Build Tools fixes it.
- **Port already in use** — change `PORT` in `.env`.
- **Signed out unexpectedly** — the token lasts 7 days by default; adjust `JWT_EXPIRES_IN`.
- **Start over with empty data** — delete the `data/` folder and restart.
