# Task Management System (TaskFlow)

Production-ready Trello/ClickUp/Asana-inspired task management system.

## Tech Stack
- React + Vite
- Node.js + Express
- MongoDB (Local or Atlas)
- JWT Authentication (access + refresh rotation)

## Quick Start (Local)

### 1) Requirements
- Node.js (18+ recommended)
- MongoDB running locally

### 2) Install dependencies
```bash
npm install
```

### 3) Configure environment
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 4) Run in development
```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000/api

## MongoDB Atlas
Replace `MONGODB_URI` in `server/.env` with your Atlas URI (`mongodb+srv://...`).

## GitHub Push (your repo)
Repo: https://github.com/Nomanazami/task-management-system

```bash
git branch -M main
git remote add origin https://github.com/Nomanazami/task-management-system.git
git add .
git commit -m "Initial commit: Task Management System"
git push -u origin main
```

