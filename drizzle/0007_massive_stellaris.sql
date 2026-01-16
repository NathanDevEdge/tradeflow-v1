CREATE TABLE `company_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_name` varchar(255),
	`abn` varchar(50),
	`address` text,
	`phone` varchar(50),
	`email` varchar(320),
	`logo_url` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_settings_id` PRIMARY KEY(`id`)
);
