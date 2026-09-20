# Task Management Application

A full-stack task management web application designed to help users create, update, organize, and track their tasks efficiently.

## 🌐 Live Website
👉 https://ananya-task-management.netlify.app/

## 🛠️ Tech Stack
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** SQLite
- **Authentication:** JWT & bcrypt
- **Real-time Updates:** Socket.IO
- **Frontend Deployment:** Netlify
- **Backend Deployment:** Render

## ✨ Features
- User registration and login
- Secure authentication and authorization
- Create, view, update, and delete tasks
- Task status and priority management
- Due date tracking
- Real-time task updates
- Responsive design for desktop and mobile
- User-specific task management

## 📂 Project Structure
```
Task_Management-Application/
│
├── backend/
│   ├── node_modules/          # installed dependencies (gitignored)
│   ├── public/
│   │   ├── index.html
│   │   ├── app.html
│   │   ├── css/
│   │   └── js/
│   │
│   ├── src/
│   │   ├── db.js
│   │   ├── middleware/
│   │   └── routes/
│   │
│   ├── data/                  # SQLite database (gitignored)
│   ├── .env                   # Environment variables (gitignored)
│   ├── .env.example           # Template for .env
│   ├── .gitignore             # backend-specific ignore rules
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```
