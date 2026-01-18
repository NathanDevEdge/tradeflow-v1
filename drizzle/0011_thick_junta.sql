ALTER TABLE `organizations` ADD `subscriptionType` enum('monthly','annual','indefinite') DEFAULT 'monthly';--> statement-breakpoint
ALTER TABLE `organizations` ADD `subscriptionEndDate` timestamp;--> statement-breakpoint
ALTER TABLE `organizations` ADD `subscriptionStatus` enum('active','expired','cancelled') DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `organizations` ADD `userLimit` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `subscriptionType`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `subscriptionEndDate`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `subscriptionStatus`;