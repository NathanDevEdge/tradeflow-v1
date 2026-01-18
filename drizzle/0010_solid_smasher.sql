CREATE TABLE `shipping_addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`attentionTo` varchar(255),
	`streetAddress` text NOT NULL,
	`state` varchar(100),
	`postcode` varchar(20),
	`country` varchar(100) NOT NULL DEFAULT 'Australia',
	`phoneNumber` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipping_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `shipping_addresses_organization_idx` ON `shipping_addresses` (`organizationId`);