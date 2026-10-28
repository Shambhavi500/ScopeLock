CREATE TABLE `change_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`change_request_id` text NOT NULL,
	`milestone_id` text NOT NULL,
	`items_json` text NOT NULL,
	`total_cents` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `change_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`raw_text` text NOT NULL,
	`extraction_json` text NOT NULL,
	`extraction_source` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contractors` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`title` text NOT NULL,
	`payout_email` text NOT NULL,
	`split_bps` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`message` text NOT NULL,
	`paypal_ref` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`ref_id` text NOT NULL,
	`title` text NOT NULL,
	`paypal_invoice_id` text,
	`invoice_number` text,
	`status` text NOT NULL,
	`total_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`items_json` text NOT NULL,
	`note` text,
	`due_date` text,
	`payer_view_url` text,
	`seeded` integer DEFAULT false NOT NULL,
	`raw_json` text,
	`created_at` text NOT NULL,
	`paid_at` text
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`seq` integer NOT NULL,
	`title` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text NOT NULL,
	`invoice_id` text
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`paypal_order_id` text,
	`paypal_capture_id` text,
	`status` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`failure_code` text,
	`attempt` integer NOT NULL,
	`raw_json` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payout_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`sender_batch_id` text NOT NULL,
	`paypal_batch_id` text,
	`status` text NOT NULL,
	`margin_cents` integer NOT NULL,
	`raw_json` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payout_batches_invoice_id_unique` ON `payout_batches` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `payout_items` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`contractor_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`paypal_item_id` text,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`client_name` text NOT NULL,
	`client_email` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`agency_margin_bps` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_card` (
	`project_id` text NOT NULL,
	`role` text NOT NULL,
	`rate_cents_per_hour` integer NOT NULL,
	PRIMARY KEY(`project_id`, `role`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`milestone_id` text NOT NULL,
	`title` text NOT NULL,
	`role` text NOT NULL,
	`start_date` text NOT NULL,
	`duration_days` integer NOT NULL,
	`depends_on` text,
	`source` text NOT NULL,
	`change_order_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
