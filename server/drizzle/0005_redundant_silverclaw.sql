CREATE TABLE `notifications` (
	`notification_id` serial AUTO_INCREMENT NOT NULL,
	`recipient_id` bigint unsigned NOT NULL,
	`notification_type` enum('project_created','project_updated','project_archived','project_restored','task_created','task_completed','task_assigned','task_updated','task_commented','invitation_received','team_updated','team_member_added','team_member_removed','role_updated','asset_attached','mentioned','deadline_approaching','task_overdue') NOT NULL,
	`message` text NOT NULL,
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notifications_notification_id` PRIMARY KEY(`notification_id`)
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `deadline_level` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipient_id_users_user_id_fk` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `deadline_level_chk` CHECK (`tasks`.`deadline_level` BETWEEN 0 AND 4);--> statement-breakpoint
CREATE INDEX `deadline_index` ON `tasks` (`due_date`,`deadline_level`);