CREATE TABLE `commitment_archives` (
	`commitment_id` text PRIMARY KEY NOT NULL,
	`archived_at` text NOT NULL,
	`archived_by` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`commitment_id`) REFERENCES `commitments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `commitment_archives_date_idx` ON `commitment_archives` (`archived_at`);--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`commitment_item_id` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price_cents` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`commitment_item_id`) REFERENCES `commitment_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_items_line_unique` ON `invoice_items` (`invoice_id`,`commitment_item_id`);--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_idx` ON `invoice_items` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `invoice_items_commitment_item_idx` ON `invoice_items` (`commitment_item_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`number` text NOT NULL,
	`invoice_date` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`calculated_total_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_order_unique` ON `invoices` (`order_id`);--> statement-breakpoint
CREATE INDEX `invoices_date_idx` ON `invoices` (`invoice_date`);