CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `commitment_items` (
	`id` text PRIMARY KEY NOT NULL,
	`commitment_id` text NOT NULL,
	`line_number` integer NOT NULL,
	`description` text NOT NULL,
	`unit` text NOT NULL,
	`contracted_quantity` real NOT NULL,
	`unit_price_cents` integer NOT NULL,
	FOREIGN KEY (`commitment_id`) REFERENCES `commitments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commitment_items_line_unique` ON `commitment_items` (`commitment_id`,`line_number`);--> statement-breakpoint
CREATE INDEX `commitment_items_commitment_idx` ON `commitment_items` (`commitment_id`);--> statement-breakpoint
CREATE TABLE `commitments` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`supplier` text NOT NULL,
	`issue_date` text NOT NULL,
	`status` text DEFAULT 'ativa' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`total_cents` integer NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commitments_number_unique` ON `commitments` (`number`);--> statement-breakpoint
CREATE INDEX `commitments_status_idx` ON `commitments` (`status`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`commitment_item_id` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price_cents` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`commitment_item_id`) REFERENCES `commitment_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_items_line_unique` ON `order_items` (`order_id`,`commitment_item_id`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_commitment_item_idx` ON `order_items` (`commitment_item_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`commitment_id` text NOT NULL,
	`reference` text NOT NULL,
	`order_date` text NOT NULL,
	`status` text DEFAULT 'rascunho' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`calculated_total_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`commitment_id`) REFERENCES `commitments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `orders_commitment_idx` ON `orders` (`commitment_id`);--> statement-breakpoint
CREATE INDEX `orders_date_idx` ON `orders` (`order_date`);