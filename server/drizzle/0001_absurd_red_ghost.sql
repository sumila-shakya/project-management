CREATE TABLE `invitations` (
	`invitation_id` serial AUTO_INCREMENT NOT NULL,
	`team_id` bigint unsigned NOT NULL,
	`invited_by` bigint unsigned NOT NULL,
	`invitee_id` bigint unsigned NOT NULL,
	`token` varchar(512) NOT NULL,
	`invitation_status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`created_at` timestamp DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `invitations_invitation_id` PRIMARY KEY(`invitation_id`)
);
--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_team_id_teams_team_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`team_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_invited_by_users_user_id_fk` FOREIGN KEY (`invited_by`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_invitee_id_users_user_id_fk` FOREIGN KEY (`invitee_id`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;