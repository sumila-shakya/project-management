CREATE TABLE `comments` (
	`comment_id` serial AUTO_INCREMENT NOT NULL,
	`task_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comments_comment_id` PRIMARY KEY(`comment_id`)
);
--> statement-breakpoint
CREATE TABLE `email_verification_tokens` (
	`token_id` serial AUTO_INCREMENT NOT NULL,
	`token` varchar(512) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `email_verification_tokens_token_id` PRIMARY KEY(`token_id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`project_id` serial AUTO_INCREMENT NOT NULL,
	`project_name` varchar(100) NOT NULL,
	`description` text,
	`team_id` bigint unsigned NOT NULL,
	`created_by` bigint unsigned NOT NULL,
	`project_status` enum('active','archived') NOT NULL DEFAULT 'active',
	`start_date` timestamp DEFAULT (now()),
	`end_date` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_project_id` PRIMARY KEY(`project_id`)
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`token_id` serial AUTO_INCREMENT NOT NULL,
	`token` varchar(512) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `refresh_tokens_token_id` PRIMARY KEY(`token_id`)
);
--> statement-breakpoint
CREATE TABLE `reset_password_tokens` (
	`token_id` serial AUTO_INCREMENT NOT NULL,
	`token` varchar(512) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `reset_password_tokens_token_id` PRIMARY KEY(`token_id`)
);
--> statement-breakpoint
CREATE TABLE `task_assets` (
	`asset_id` serial AUTO_INCREMENT NOT NULL,
	`task_id` bigint unsigned NOT NULL,
	`file_name` varchar(100) NOT NULL,
	`file_url` varchar(500) NOT NULL,
	`file_size` bigint unsigned NOT NULL,
	`uploaded_by` bigint unsigned NOT NULL,
	`uploaded_at` timestamp DEFAULT (now()),
	CONSTRAINT `task_assets_asset_id` PRIMARY KEY(`asset_id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`task_id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(100) NOT NULL,
	`description` text,
	`project_id` bigint unsigned NOT NULL,
	`created_by` bigint unsigned NOT NULL,
	`assigned_to` bigint unsigned,
	`parent_task_id` bigint unsigned,
	`task_status` enum('todo','in_progress','in_review','completed') NOT NULL DEFAULT 'todo',
	`task_priority` enum('low','medium','high','urgent') NOT NULL,
	`due_date` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completed_at` timestamp,
	CONSTRAINT `tasks_task_id` PRIMARY KEY(`task_id`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`team_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`role` enum('admin','member','team_leader') NOT NULL DEFAULT 'member',
	`joined_at` timestamp DEFAULT (now()),
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_member` UNIQUE(`team_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`team_id` serial AUTO_INCREMENT NOT NULL,
	`team_name` varchar(100) NOT NULL,
	`description` text,
	`created_by` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_team_id` PRIMARY KEY(`team_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` serial AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`name` varchar(100) NOT NULL,
	`bio` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`is_verified` boolean NOT NULL DEFAULT false,
	CONSTRAINT `users_user_id` PRIMARY KEY(`user_id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_task_id_tasks_task_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`task_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_user_id_users_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `email_verification_tokens` ADD CONSTRAINT `email_verification_tokens_user_id_users_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_team_id_teams_team_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`team_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_users_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_users_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `reset_password_tokens` ADD CONSTRAINT `reset_password_tokens_user_id_users_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `task_assets` ADD CONSTRAINT `task_assets_task_id_tasks_task_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`task_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `task_assets` ADD CONSTRAINT `task_assets_uploaded_by_users_user_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_project_id_projects_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`project_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_created_by_users_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_to_users_user_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_parent_task_id_tasks_task_id_fk` FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`task_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_team_id_teams_team_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`team_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_user_id_users_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_created_by_users_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `email_verification_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `refresh_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `reset_password_tokens` (`user_id`);