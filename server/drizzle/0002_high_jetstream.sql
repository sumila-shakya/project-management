CREATE TABLE `reset_password_tokens` (
	`token_id` serial AUTO_INCREMENT NOT NULL,
	`token` varchar(512) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `reset_password_tokens_token_id` PRIMARY KEY(`token_id`)
);
--> statement-breakpoint
ALTER TABLE `reset_password_tokens` ADD CONSTRAINT `reset_password_tokens_user_id_users_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `reset_password_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `refresh_tokens` (`user_id`);