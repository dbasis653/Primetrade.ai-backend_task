# Primetrade.ai – Backend Task

Scalable REST API with JWT Authentication, Role-Based Access Control, and Task Management.

**Live Backend:** https://primetrade-ai-backend-task.onrender.com
**Live Frontend:** https://primetrade-ai-frontend-task-six.vercel.app
**Backend Repo:** https://github.com/dbasis653/Primetrade.ai-backend_task
**Frontend Repo:** https://github.com/dbasis653/Primetrade.ai-frontend_task

---

## Project Structure

```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.js       # Register, login, email verify, password reset
│   │   └── tasks.controllers.js     # Task + task member CRUD
│   ├── middlewares/
│   │   ├── auth.middleware.js       # verifyJWT
│   │   ├── permission.middleware.js # verifyPermission (role check)
│   │   ├── multer.middleware.js     # File upload handler
│   │   └── validator.middleware.js  # express-validator error handler
│   ├── models/
│   │   ├── user.model.js            # User schema
│   │   ├── task.models.js           # Task schema
│   │   └── projectmember.models.js  # TaskMember schema (user ↔ task)
│   ├── routes/
│   │   ├── auth.routes.js           # /api/v1/auth/*
│   │   └── task.routes.js           # /api/v1/tasks/*
│   ├── utils/
│   │   ├── api-error.js             # Custom ApiError class
│   │   ├── api-response.js          # Consistent ApiResponse wrapper
│   │   ├── async-handler.js         # Try/catch wrapper for async controllers
│   │   ├── constants.js             # Task status enums
│   │   └── mail.js                  # Nodemailer + Mailgen helpers
│   ├── validator/
│   │   └── index.js                 # All express-validator rule sets
│   ├── db/
│   │   └── database_connection.js   # MongoDB connection
│   ├── app.js                       # Express app setup + CORS + routes
│   └── index.js                     # Entry point (connects DB then starts server)
├── .env                             # (not committed — see below)
├── package.json
└── README.md
```

---

## Local Setup

### Prerequisites

- Node.js v18+
- npm v9+
- A MongoDB URI (MongoDB Atlas free tier works)
- A [Mailtrap](https://mailtrap.io) account for email (free sandbox)

---

### Step 1 — Clone and install

```bash
git clone https://github.com/dbasis653/Primetrade.ai-backend_task.git
cd Primetrade.ai-backend_task
npm install
```

---

### Step 2 — Create `.env` file

Create a file named `.env` in the project root (same level as `package.json`):

```env
# ── Server ────────────────────────────────────────────────
PORT=8000

# ── Database ──────────────────────────────────────────────
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>

# ── CORS ──────────────────────────────────────────────────
# Comma-separated list of allowed frontend origins
CORS_ORIGIN=http://localhost:5173

# ── JWT ───────────────────────────────────────────────────
ACCESS_TOKEN_SECRET=your_access_token_secret_here
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
REFRESH_TOKEN_EXPIRY=10d

# ── Email (Mailtrap sandbox) ──────────────────────────────
MAILTRAP_SMTP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_SMTP_PORT=2525
MAILTRAP_SMTP_USER=your_mailtrap_user
MAILTRAP_SMTP_PASS=your_mailtrap_pass

# ── Password Reset ────────────────────────────────────────
# URL of your frontend's reset-password page
FORGOT_PASSWORD_REDIRECT_URL=http://localhost:5173/reset-password

# ── Server URL (used for uploaded file URLs) ──────────────
SERVER_URL=http://localhost:8000
```

---

### Step 3 — Run the server

```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

Server starts at `http://localhost:8000` by default.

You should see:

```
MONGODB IS CONNECTED
App is listening on the port http://localhost:8000
```

---

## API Reference

All endpoints are versioned under `/api/v1`.

🔒 = requires `Authorization: Bearer <accessToken>` header
👑 = admin role (`global-admin`) required

---

### Authentication — `/api/v1/auth`

| Method | Endpoint                     | Auth  | Description               |
| ------ | ---------------------------- | ----- | ------------------------- |
| POST   | `/register`                  | —     | Register a new user       |
| POST   | `/login`                     | —     | Login, returns tokens     |
| POST   | `/logout`                    | 🔒    | Clear tokens              |
| POST   | `/current-user`              | 🔒    | Get logged-in user info   |
| GET    | `/verify-email/:token`       | —     | Verify email address      |
| POST   | `/refresh-token`             | —     | Get new access token      |
| POST   | `/forgot-password`           | —     | Send password reset email |
| POST   | `/reset-password/:token`     | —     | Reset password            |
| POST   | `/change-password`           | 🔒    | Change current password   |
| POST   | `/resend-email-verification` | 🔒    | Resend verification email |
| GET    | `/users`                     | 🔒 👑 | List all users            |
| DELETE | `/users/:userId`             | 🔒 👑 | Delete a user             |

---

### Tasks — `/api/v1/tasks`

| Method | Endpoint                   | Auth  | Description               |
| ------ | -------------------------- | ----- | ------------------------- |
| GET    | `/`                        | 🔒    | Get tasks (role-filtered) |
| POST   | `/`                        | 🔒 👑 | Create a task             |
| GET    | `/:taskId`                 | 🔒    | Get task details          |
| PUT    | `/:taskId`                 | 🔒 👑 | Update a task             |
| DELETE | `/:taskId`                 | 🔒 👑 | Delete a task             |
| GET    | `/:taskId/members`         | 🔒    | List task members         |
| POST   | `/:taskId/members`         | 🔒 👑 | Add a member to task      |
| DELETE | `/:taskId/members/:userId` | 🔒 👑 | Remove a member from task |

---

## Scalability

- **Microservices** — Auth and task logic are already separated by route/controller. Each can be split into its own service and deployed independently as traffic grows.
- **Caching** — Frequently read data (e.g. task lists, user lookups) can be cached with Redis to reduce database load.
- **Load Balancing** — The API is stateless (JWT-based auth), so multiple instances can run behind a load balancer (e.g. Nginx, AWS ALB) with no shared session concerns.
