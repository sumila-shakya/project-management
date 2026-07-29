# Task Management System — Backend API

A production-grade collaborative task management REST API built with Node.js, TypeScript, and Express. Designed with real-world backend engineering practices including polyglot persistence, event-driven notifications, role-based access control, and comprehensive audit logging.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript (strict mode) |
| Framework | Express.js v5 |
| Relational DB | MySQL + Drizzle ORM |
| Document DB | MongoDB + Mongoose |
| Validation | Zod |
| Authentication | JWT (access + refresh tokens) |
| File Storage | Cloudinary + Multer |
| Email | Nodemailer + Mailtrap (dev) |
| Scheduling | node-cron |
| Password Hashing | bcrypt |

---

## Architecture

This project follows a layered **MVC architecture** with strict separation of concerns:

```
Request → Router → Controller → Service → Repository (Drizzle/Mongoose) → Database
```

- **Controllers** — Handle HTTP only. Read `req`, send `res`. Zero business logic.
- **Services** — Own all business logic and orchestration.
- **Validators** — Zod schemas guard every route boundary before the controller runs.
- **Utils** — Shared helpers (cursor parser and generator, token generation, ID parsing).

### Polyglot Persistence

Two databases serve different purposes:

| MySQL | MongoDB |
|---|---|
| Structured relational data | Flexible document data |
| Users, teams, projects, tasks | Activity logs, analytics snapshots |
| ACID transactions | Append-only event logs |
| Foreign key integrity | Cursor-paginated history feeds |

---

## Project Structure

```
project-management/
├── .gitignore                            # Root level — applies to entire monorepo
├── README.md                             # Root level — project documentation
└── server/                               # Entire backend lives here
    ├── drizzle/                          # Drizzle generated migration files
    ├── node_modules/
    ├── src/
    │   ├── @types/
    │   │   ├── express.d.ts              # Express Request augmentation
    │   │   └── interface.ts              # Shared TypeScript interfaces (Payload, AuthRequest, IAnalyticsLog)
    │   │
    │   ├── config/
    │   │   ├── env.config.ts             # Environment variable validation and export
    │   │   ├── mongodb.config.ts         # Mongoose connection setup
    │   │   └── mysql.config.ts           # Drizzle + mysql2 connection setup
    │   │
    │   ├── controllers/
    │   │   ├── auth.controller.ts        # register, login, logout, refresh, verifyEmail,
    │   │   │                             # resendVerification, forgotPassword, resetPassword,
    │   │   │                             # changePassword, updateAccount, uploadAvatar
    │   │   ├── comment.controller.ts     # addComment, getComments, editComment, deleteComment
    │   │   ├── invitation.controller.ts  # sendInvitation, getInvitations, processInvitation
    │   │   ├── notification.controller.ts# getNotifications, markAsRead,
    │   │   │                             # markAllAsRead, deleteNotification
    │   │   ├── project.controller.ts     # createProject, getProjects, getProjectDetails,
    │   │   │                             # updateProject, archiveProject, restoreProject,
    │   │   │                             # deleteProject, getProjectActivity
    │   │   ├── task-assets.controller.ts # uploadAsset, getAssets, deleteAsset
    │   │   ├── task.controller.ts        # createTask, getTasksInProject, getTaskDetails,
    │   │   │                             # updateTask, changeTaskStatus, assignTask,
    │   │   │                             # deleteTask, getTaskActivity
    │   │   └── team.controller.ts        # createTeam, getTeams, getTeamDetails, updateTeam,
    │   │                                 # deleteTeam, getMembers, updateMemberRole,
    │   │                                 # removeMember, getTeamOverview, getTeamActivity
    │   │
    │   ├── cron/
    │   │   └── notification.cron.ts      # Scheduled jobs: deadline alerts (multilevel)                               
    │   │
    │   ├── events/
    │   │   └── system.events.ts          # EventEmitter for decoupled notification triggers
    │   │
    │   ├── middlewares/
    │   │   ├── auth.middleware.ts        # JWT verification, attaches req.user
    │   │   ├── error.middleware.ts       # Global error handler (ZodError, ApiError, unknown)
    │   │   └── multer.middleware.ts      # File upload config, MIME type filter, size limits
    │   │
    │   ├── models/
    │   │   ├── mongodb.model.ts          # Mongoose schemas: ActivityLog
    │   │   └── mysql.model.ts            # Drizzle schemas: users, teams, teamMembers,
    │   │                                 # projects, tasks, taskAssets, comments,
    │   │                                 # invitations, notifications, refreshTokens,
    │   │                                 # resetPasswordTokens, emailVerificationTokens
    │   │
    │   ├── routes/
    │   │   ├── auth.route.ts             # /api/auth/*
    │   │   ├── comment.route.ts          # /api/tasks/:taskId/comments/*
    │   │   ├── invitation.route.ts       # /api/invitations/*
    │   │   ├── notification.route.ts     # /api/notifications/*
    │   │   ├── project.route.ts          # /api/teams/:teamId/projects, /api/projects/:id/*
    │   │   ├── task-assets.route.ts      # /api/tasks/:taskId/assets/*
    │   │   ├── task.route.ts             # /api/tasks/*, /api/projects/:projectId/tasks
    │   │   └── team.route.ts             # /api/teams/*
    │   │
    │   ├── services/
    │   │   ├── auth.service.ts           # register, login, logout, refresh, verifyEmail,
    │   │   │                             # resendVerification, forgotPassword, resetPassword,
    │   │   │                             # changePassword, updateAccount
    │   │   ├── comment.service.ts        # addComment, getComments, editComment, deleteComment
    │   │   ├── invitation.service.ts     # sendInvitation, getInvitations, processInvitation
    │   │   ├── notification.service.ts   # notify, notifyMany, getNotifications,
    │   │   │                             # markAsRead, markAllAsRead, deleteNotification
    │   │   ├── project.service.ts        # createProject, getProjects, getProjectDetails,
    │   │   │                             # updateProject, archiveProject, restoreProject,
    │   │   │                             # deleteProject, getProjectActivity
    │   │   ├── task-assets.service.ts    # uploadAsset, getAssets, deleteAsset
    │   │   ├── task.service.ts           # createTask, getTasksInProject, getTaskDetails,
    │   │   │                             # updateTask, changeTaskStatus, assignTask,
    │   │   │                             # deleteTask, getTaskActivity
    │   │   └── team.service.ts           # createTeam, getTeams, getTeamDetails, updateTeam,
    │   │                                 # deleteTeam, getMembers, updateMemberRole,
    │   │                                 # removeMember, getTeamOverview, getTeamActivity
    │   │
    │   ├── utils/
    │   │   ├── apiError.ts               # ApiError class with statusCode and message
    │   │   ├── apiResponse.ts            # ApiResponse envelope { statusCode, data, message }
    │   │   ├── cloudinary.ts             # Cloudinary upload stream helper (buffer → URL)
    │   │   ├── constants.ts              # ROLE, TASK_STATUS, TASK_PRIORITY, PROJECT_STATUS,
    │   │   │                             # ACTIONS, ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS,
    │   │   │                             # COOKIES_OPTIONS
    │   │   ├── cursor.ts                 # generateCursor, parseCursor (base64url encode/decode)
    │   │   ├── file-helper.ts            # file mime parser,
    │   │   ├── jwt.ts                    # generateAccessToken, generateRefreshToken,
    │   │   │                             # verifyAccessToken, verifyRefreshToken, getExpiryDate
    │   │   ├── mailer.ts                 # Nodemailer transporter, sendVerificationMail,
    │   │   │                             # sendResetPasswordMail
    │   │   ├── status-transition.ts      # Task state machine — valid transition map,
    │   │   │                             # validateStatusTransition()
    │   │   ├── token.ts                  # generateToken (crypto.randomBytes),
    │   │   │                             # hashToken (SHA-256)
    │   │   └── validate-id.ts            # parseId — URL param string → validated number
    │   │
    │   ├── validator/
    │   │   ├── assets.validator.ts       # uploadAssetSchema
    │   │   ├── auth.validator.ts         # registrationSchema, loginSchema, resetPasswordSchema,
    │   │   │                             # forgetPasswordSchema, updateAccountSchema,
    │   │   │                             # changePasswordSchema, emailVerificationSchema
    │   │   ├── comment.validator.ts      # addCommentSchema, editCommentSchema
    │   │   ├── global.validator.ts       # Shared reusable Zod schemas (pagination, dates)
    │   │   ├── invitation.validator.ts   # invitationSchema, processInvitationSchema
    │   │   ├── notification.validator.ts # notificationQuerySchema
    │   │   ├── project.validator.ts      # projectSchema, updateProjectSchema,
    │   │   │                             # filterProjectSchema
    │   │   ├── task.validator.ts         # createTaskSchema, updateTaskSchema,
    │   │   │                             # changeStatusSchema, assignTaskSchema,
    │   │   │                             # filterTaskSchema
    │   │   └── team.validator.ts         # createTeamSchema, updateTeamSchema,
    │   │                                 # updateMemberRoleSchema
    │   │
    │   ├── app.ts                        # Express app setup, global middlewares, route mounting
    │   └── server.ts                     # HTTP server bootstrap, DB connections, cron init
    │
    ├── test/                             # Test directory
    ├── uploads/                          # Temporary local upload directory
    ├── .env                              # Environment variables (gitignored)
    ├── .env.example                      # Environment variable template
    ├── drizzle.config.js                 # Drizzle Kit configuration
    ├── package.json
    ├── package-lock.json
    └── tsconfig.json
```

---

## Features

### Authentication & User Management

- Registration with automatic email verification (24hr token expiry)
- JWT-based login with access token (15min) and refresh token (7 days)
- Stateful refresh token rotation — stored and validated in MySQL
- Forgot password and reset password via email token (15min expiry)
- Change password invalidates all active sessions across devices
- Account update (name, bio) with partial Zod validation
- Avatar upload via Cloudinary

> **Note:** During development, SMTP port `2525` was blocked by ISP. Mailtrap worked correctly on port `587`. If emails are not sending, try changing `MAIL_PORT` in `.env`.

### Team Management

- Create teams — creator is automatically assigned admin role (atomic transaction)
- In-app invitation system — invitations stored in DB, delivered via notifications
- Accept or decline invitations via single `PATCH /invitations/:id` route
- Role-based member management — admin, team_leader, member
- Update member roles with last-admin protection (cannot demote or remove sole admin)
- Remove members with cascade notification

### Project Management

- Projects scoped to teams with role-based access
- Two-step deletion: archive first, hard delete second (prevents accidental loss)
- Restore archived projects
- Project progress tracking via conditional SQL aggregation

### Task Management

- Full CRUD with role + assignee-based access control
- Task status managed as a **finite state machine** — invalid transitions are blocked
- Separate routes for status change and task assignment (explicit intent)
- Subtask support via self-referencing `parentTaskId` foreign key
- File attachments via Cloudinary with MIME type validation
- Allowed types: images, PDFs, Office documents, plain text, archives, videos
- Per-category file size limits (images 5MB, documents 10MB, video 100MB)

### Activity Logging (MongoDB)

Every meaningful task event is written to MongoDB as an immutable log entry:

```
created, updated, deleted, completed, commented, comment_deleted, assigned, asset_attached, asset_deleted
```

Each log entry embeds display metadata at write time (actor name, task title, project name) so the audit feed renders correctly even after the source records are deleted.

The activity feed endpoints — cursor-paginated (newest first):

```
GET /api/teams/:teamId/activity
```

### Notifications

- Polling-based in-app notification system
- Centralized `NotificationService`
- Events that trigger notifications: task assignment, invitation, role change, member removal, deadline alerts, comment mentions, status changes
- Cursor-paginated notification list
- Lightweight unread count endpoint for efficient polling
- Mark single or all notifications as read
- Email notifications for password reset and email verification

### Background Jobs (node-cron)

- **Deadline alerts** — runs daily, checks task due dates, sends multilevel notifications (3 days, 1 day, 3 hrs, overdue)

### Search & Filters

- Tasks filterable by status, priority
- Projects filterable by status with role-based visibility enforcement
- Notifications filterable by read status
- Dynamic query builder pattern — filters applied conditionally without multiple code paths

### Pagination

Two pagination strategies used based on use case:

| Strategy | Used For | Why |
|---|---|---|
| Offset (page/limit) | Tasks, projects, team members | Users navigate by page number |
| Cursor (base64url encoded) | Activity logs, notifications, comments | Infinite scroll, stable under inserts |

Cursor encodes `{ id, timestamp }` as `base64url` — URL-safe, opaque to the client.

---

## Security Practices

- Passwords hashed with bcrypt (cost factor 10)
- Reset and verification tokens hashed with SHA-256 before DB storage (raw token travels only in email)
- `httpOnly` + `sameSite: strict` cookies for refresh tokens
- JWT payload validated with Zod after signature verification (shape, not just signature)
- Generic error messages on auth failures (no user enumeration)
- Information leakage prevention — unauthorized resource access always returns 403 regardless of whether resource exists
- Token rotation on every refresh — stolen tokens become invalid after single use
- All active sessions invalidated on password change and reset

---

## Database Design Highlights

- All multi-write operations wrapped in **Drizzle transactions** (team creation, invitation processing, password reset, email verification)
- Self-referencing `parentTaskId` on tasks table for subtask hierarchy
- Composite unique constraint on `(teamId, userId)` in team_members
- `onDelete: 'set null'` for `assignedTo` — deleting a user unassigns their tasks, not deletes them
- MongoDB indexes on `(teamId, timestamp)`, `(projectId, timestamp)`, `(taskId, timestamp)` for activity log query performance

---

## API Overview

```
Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/verify-email
POST   /api/auth/resend-verification
POST   /api/auth/refresh
POST   /api/auth/forget-password
POST   /api/auth/reset-password
PATCH  /api/auth/change-password
PATCH  /api/auth/me
GET    /api/auth/me

Teams
GET    /api/teams
POST   /api/teams
GET    /api/teams/:teamId
PATCH  /api/teams/:teamId
DELETE /api/teams/:teamId
GET    /api/teams/:teamId/members
POST   /api/teams/:teamId/invite
DELETE /api/teams/:teamId/members/:memberId
PATCH  /api/teams/:teamId/members/:memberId/role
GET    /api/teams/:teamId/overview
GET    /api/teams/:teamId/activity

Projects
GET    /api/teams/:teamId/projects
POST   /api/teams/:teamId/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
PATCH  /api/projects/:projectId/archive
PATCH  /api/projects/:projectId/restore
GET    /api/projects/:id/progress

Tasks
GET    /api/projects/:projectId/tasks
POST   /api/projects/:projectId/tasks
GET    /api/tasks/:taskId
GET    /api/tasks/my-tasks
PATCH  /api/tasks/:taskId
DELETE /api/tasks/:taskId
PATCH  /api/tasks/:taskId/status
PATCH  /api/tasks/:taskId/assign
GET    /api/tasks/:taskId/subtasks

Task-Assets
POST   /api/tasks/:taskId/assets
GET    /api/tasks/:taskId/assets
GET    /api/assets/:assetId/download
DELETE /api/assets/:assetId

Comments
POST   /api/tasks/:taskId/comments
GET    /api/tasks/:taskId/comments
PATCH  /api/comments/:commentId
DELETE /api/comments/:commentId

Notifications
GET    /api/notifications
PATCH  /api/notifications/:notificationId/read
PATCH  /api/notifications/:notificationId/unread
PATCH  /api/notifications/read-all
DELETE /api/notifications/:notificationId

Invitations
GET    /api/invitations
PATCH  /api/invitations/:invitationId/process
```

---

## Environment Variables

```env
PORT = 3000

# mysql credentials
DB_HOST = "localhost"
DB_USER = "root"
DB_PASSWORD = "password"
DB_NAME = "project_management_db"

# mongodb uri
MONGODB_URI = "mongodb://localhost:27017/project_management_db"

# JWT Tokens
ACCESS_TOKEN_SECRET = "access token secret"
REFRESH_TOKEN_SECRET = "refresh token secret"

# Ethereal credentials
MAIL_HOST = "sandbox.smtp.mailtrap.io"
MAIL_PORT = 587
MAIL_USER = "your_mailtrap_user"
MAIL_PASS = "your_mailtrap_pass"
MAIL_FROM = "noreply@taskmanager.com"

# client url
CLIENT_URL = "http://localhost:5000"

# cloudinary credentials
CLOUDINARY_CLOUD_NAME= "your_cloud_name"
CLOUDINARY_API_KEY= "your_api_key"
CLOUDINARY_API_SECRET= "your_api_secret"
```

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/project-management-server.git
cd project-management-server

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your values in .env

# Push database schema to MySQL
npm run db:push

# Start development server
npm run dev
```

---

## Scripts

```bash
npm run dev          # Start with tsx + nodemon (hot reload)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled output
npm run db:generate  # Generate Drizzle migration files
npm run db:push      # Push schema changes to database
```

---

## Design Decisions & Tradeoffs

**Why two databases?**
MySQL handles structured relational data with strict consistency requirements (users, teams, tasks). MongoDB handles append-only, flexible-schema event data (activity logs) where document shape varies per action type and read performance matters more than normalization.

**Why stateful refresh tokens?**
Storing refresh tokens in the DB enables true token revocation — logout actually invalidates the token server-side. Pure JWT refresh tokens cannot be revoked before expiry.

**Why cursor pagination for activity logs?**
Activity logs are append-only and consumed as infinite scroll feeds. Offset pagination breaks when new logs are inserted mid-scroll (page drift). Cursor pagination is stable regardless of concurrent inserts.

---

## Known Limitations & Future Improvements

- Notification delivery is polling-based — upgrade path is Socket.io with Redis adapter for horizontal scaling
- Activity log writes are fire-and-forget — a message queue (Bull/BullMQ) would guarantee delivery under high load
- Single server deployment — `connectedUsers` Map works for one instance; Redis Pub/Sub needed for multi-instance
- No rate limiting on auth routes — add `express-rate-limit` before production deployment
- No request logging — add Morgan or Pino for production observability


---

## 👤 Author

**Sumila Shakya**
- Student ID: 80010269
- Course: BSc CSIT (6th Semester)
- Institution: Amrit Science College
- GitHub: [@sumila-shakya](https://github.com/sumila-shakya)

---

## 📄 License

This project is built for educational and portfolio purposes.