ALTER TABLE `comments` RENAME COLUMN `user_id` TO `author_id`;--> statement-breakpoint
ALTER TABLE `comments` DROP FOREIGN KEY `comments_user_id_users_user_id_fk`;
--> statement-breakpoint
ALTER TABLE `comments` ADD `is_edited` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_author_id_users_user_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`user_id`) ON DELETE cascade ON UPDATE cascade;