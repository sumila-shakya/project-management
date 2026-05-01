import { mysqlTable, serial, varchar, timestamp, text, bigint, mysqlEnum, unique, AnyMySqlColumn, index, boolean } from "drizzle-orm/mysql-core";
import { ROLE, PROJECT_STATUS, TASK_STATUS, TASK_PRIORITY, INVITATION_STATUS } from "../utils/constants";

/* ------------------------------------------ SCHEMA DEFINITIONS ------------------------------------------ */

// USERS SCHEMA
export const users = mysqlTable('users', {
    userId: serial('user_id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    bio: text('bio'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().onUpdateNow(),
    isverified: boolean('is_verified').notNull().default(false)
})

// TEAMS SCHEMA
export const teams = mysqlTable('teams', {
    teamId: serial('team_id').primaryKey(),
    teamName: varchar('team_name', { length: 100 }).notNull(),
    description: text('description'),
    createdBy: bigint('created_by', { mode: 'number', unsigned: true }).notNull().references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().onUpdateNow()
})

// TEAM MEMBERS SCHEMA
export const teamMembers = mysqlTable('team_members', {
    id: serial('id').primaryKey(),
    teamId: bigint('team_id', { mode: 'number', unsigned: true }).notNull().references(() => teams.teamId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull().references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    role: mysqlEnum('role', ROLE).notNull().default('member'),
    joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow(),
}, (table) => {
    return { uniqueMember: unique('unique_member').on( table.teamId, table.userId )}
})

// PROJECTS SCHEMA
export const projects = mysqlTable('projects', {
    projectId: serial('project_id').primaryKey(),
    projectName: varchar('project_name', { length: 100 }).notNull(),
    description: text('description'),
    teamId: bigint('team_id', { mode: 'number', unsigned: true }).notNull().references(() => teams.teamId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    createdBy: bigint('created_by', { mode: 'number', unsigned: true }).notNull().references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    projectStatus: mysqlEnum('project_status', PROJECT_STATUS).notNull().default('active'),
    startDate: timestamp('start_date',{ mode:'date' }).defaultNow(),
    endDate: timestamp('end_date',{ mode:'date' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().onUpdateNow()
})

// TASKS SCHEMA
export const tasks = mysqlTable('tasks', {
    taskId: serial('task_id').primaryKey(),
    title: varchar('title', { length: 100 }).notNull(),
    description: text('description'),
    projectId: bigint('project_id', { mode: 'number', unsigned: true }).notNull().references(() => projects.projectId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    createdBy: bigint('created_by', { mode: 'number', unsigned: true }).notNull().references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    assignedTo: bigint('assigned_to', { mode: 'number', unsigned: true }).references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    parentTaskId: bigint('parent_task_id', { mode: 'number', unsigned: true }).references(() : AnyMySqlColumn => tasks.taskId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    taskStatus: mysqlEnum('task_status', TASK_STATUS).notNull().default('todo'),
    taskPriority: mysqlEnum('task_priority', TASK_PRIORITY).notNull(),
    dueDate: timestamp('due_date',{ mode:'date' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().onUpdateNow(),
    completedAt: timestamp('completed_at',{mode:'date'})
})

// TASK ASSETS SCHEMA
export const taskAssets = mysqlTable('task_assets', {
    assetId: serial('asset_id').primaryKey(),
    taskId: bigint('task_id', { mode: 'number', unsigned: true }).notNull().references(() => tasks.taskId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    fileName: varchar('file_name', { length: 100 }).notNull(),
    fileUrl: varchar('file_url', { length: 500 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number', unsigned: true}).notNull(),
    uploadedBy: bigint('uploaded_by', { mode: 'number', unsigned: true }).notNull().references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    uploadedAt: timestamp('uploaded_at', { mode: 'date' }).defaultNow(),
})

// COMMENTS SCHEMA
export const comments = mysqlTable('comments', {
    commentId: serial('comment_id').primaryKey(),
    taskId: bigint('task_id', { mode: 'number', unsigned: true }).notNull().references(() => tasks.taskId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull().references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().onUpdateNow(),
})

// REFRESH TOKEN SCHEMA
export const refreshTokens = mysqlTable('refresh_tokens', {
    tokenId: serial('token_id').primaryKey(),
    token: varchar('token', { length: 512 }).notNull(),
    userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull().references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
}, (table) => {
    return { userIdIdx: index('user_id_idx').on(table.userId) }
})

// PASSWORD RESET SCHEMA
export const resetPasswordTokens = mysqlTable('reset_password_tokens', {
    tokenId: serial('token_id').primaryKey(),
    token: varchar('token', { length: 512 }).notNull(),
    userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull().references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
}, (table) => {
    return { userIdIdx: index('user_id_idx').on(table.userId) }
})

// EMAIL VERIFICATION SCHEMA
export const emailVerificationTokens = mysqlTable('email_verification_tokens', {
    tokenId: serial('token_id').primaryKey(),
    token: varchar('token', { length: 512 }).notNull(),
    userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull().references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
}, (table) => {
    return { userIdIdx: index('user_id_idx').on(table.userId) }
})

export const invitations = mysqlTable('invitations', {
    invitationId: serial('invitation_id').primaryKey(),
    teamId: bigint('team_id', { mode: 'number', unsigned: true }).notNull().references(() => teams.teamId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    invitedBy: bigint('invited_by', { mode: 'number', unsigned: true }).notNull().references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    inviteeId: bigint('invitee_id', { mode: 'number', unsigned: true }).notNull().references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    token: varchar('token', { length: 512 }).notNull(),
    invitationStatus: mysqlEnum('invitation_status', INVITATION_STATUS).notNull().default('pending'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
})

/* ------------------------------------------ TYPE DEFINITIONS ------------------------------------------ */

// USERS SCHEMA TYPE
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// TEAMS SCHEMA TYPE
export type Team = typeof teams.$inferSelect
export type NewTeam = typeof teams.$inferInsert

// TEAM MEMBERS TYPE
export type TeamMember = typeof teamMembers.$inferSelect
export type NewTeamMember = typeof teamMembers.$inferInsert

// PROJECTS TYPE
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert

// TASKS TYPE
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert

// TASK ASSETS TYPE
export type TaskAssets = typeof taskAssets.$inferSelect
export type NewTaskAssets = typeof taskAssets.$inferInsert

// COMMENTS TYPE
export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert

// REFRESH TOKEN TYPE
export type Token = typeof refreshTokens.$inferSelect
export type NewToken = typeof refreshTokens.$inferInsert

// RESET TOKEN TYPE
export type ResetPassToken = typeof resetPasswordTokens.$inferSelect
export type NewResetPassToken = typeof resetPasswordTokens.$inferInsert

// EMAIL VERIFICATION TOKEN TYPE
export type EmailToken = typeof emailVerificationTokens.$inferSelect
export type NewEmailToken = typeof emailVerificationTokens.$inferInsert

export type Invitation = typeof invitations.$inferSelect
export type NewInvitation = typeof invitations.$inferInsert