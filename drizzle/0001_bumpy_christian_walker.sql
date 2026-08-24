CREATE TABLE `commitment_reinforcement_items` (
	`id` text PRIMARY KEY NOT NULL,
	`reinforcement_id` text NOT NULL,
	`commitment_item_id` text NOT NULL,
	`added_quantity` real NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`added_total_cents` integer NOT NULL,
	FOREIGN KEY (`reinforcement_id`) REFERENCES `commitment_reinforcements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`commitment_item_id`) REFERENCES `commitment_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commitment_reinforcement_items_line_unique` ON `commitment_reinforcement_items` (`reinforcement_id`,`commitment_item_id`);--> statement-breakpoint
CREATE INDEX `commitment_reinforcement_items_reinforcement_idx` ON `commitment_reinforcement_items` (`reinforcement_id`);--> statement-breakpoint
CREATE INDEX `commitment_reinforcement_items_commitment_item_idx` ON `commitment_reinforcement_items` (`commitment_item_id`);--> statement-breakpoint
CREATE TABLE `commitment_reinforcements` (
	`id` text PRIMARY KEY NOT NULL,
	`commitment_id` text NOT NULL,
	`reference` text NOT NULL,
	`reinforcement_date` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`total_cents` integer NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`commitment_id`) REFERENCES `commitments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `commitment_reinforcements_commitment_idx` ON `commitment_reinforcements` (`commitment_id`);--> statement-breakpoint
CREATE INDEX `commitment_reinforcements_date_idx` ON `commitment_reinforcements` (`reinforcement_date`);