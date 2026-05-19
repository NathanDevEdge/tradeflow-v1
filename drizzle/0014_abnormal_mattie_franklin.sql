ALTER TABLE `organizations` MODIFY COLUMN `subscriptionStatus` enum('active','expired','cancelled','trial') DEFAULT 'trial';--> statement-breakpoint
ALTER TABLE `company_settings` ADD `smtp_host` varchar(255);--> statement-breakpoint
ALTER TABLE `company_settings` ADD `smtp_port` int DEFAULT 587;--> statement-breakpoint
ALTER TABLE `company_settings` ADD `smtp_user` varchar(320);--> statement-breakpoint
ALTER TABLE `company_settings` ADD `smtp_password` varchar(500);--> statement-breakpoint
ALTER TABLE `company_settings` ADD `smtp_from_email` varchar(320);--> statement-breakpoint
ALTER TABLE `company_settings` ADD `smtp_from_name` varchar(255);--> statement-breakpoint
ALTER TABLE `company_settings` ADD `smtp_secure` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `organizations` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `organizations` ADD `stripeSubscriptionId` varchar(255);