CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `company_settings` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `pricelist_items` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `pricelists` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `organizationId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `company_settings` ADD CONSTRAINT `company_settings_organizationId_unique` UNIQUE(`organizationId`);--> statement-breakpoint
CREATE INDEX `pricelist_organization_idx` ON `pricelists` (`organizationId`);--> statement-breakpoint
CREATE INDEX `organization_idx` ON `users` (`organizationId`);