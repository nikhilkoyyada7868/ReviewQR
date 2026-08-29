CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`session_id` text NOT NULL,
	`event_type` text NOT NULL,
	`rating` integer,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`dedupe_key` text,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `review_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_events_dedupe_key_uq` ON `analytics_events` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `analytics_events_restaurant_type_time_idx` ON `analytics_events` (`restaurant_id`,`event_type`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_session_time_idx` ON `analytics_events` (`session_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `operation_keys` (
	`scope` text NOT NULL,
	`key` text NOT NULL,
	`response_ref` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operation_keys_scope_key_uq` ON `operation_keys` (`scope`,`key`);--> statement-breakpoint
CREATE INDEX `operation_keys_expiry_idx` ON `operation_keys` (`expires_at`);--> statement-breakpoint
CREATE TABLE `rate_limit_buckets` (
	`bucket_key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`window_started_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_buckets_expiry_idx` ON `rate_limit_buckets` (`expires_at`);--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`slug` text NOT NULL,
	`display_name` text NOT NULL,
	`location_label` text NOT NULL,
	`google_review_url` text NOT NULL,
	`approved_facts_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'inactive' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restaurants_public_id_uq` ON `restaurants` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `restaurants_slug_uq` ON `restaurants` (`slug`);--> statement-breakpoint
CREATE INDEX `restaurants_status_idx` ON `restaurants` (`status`);--> statement-breakpoint
CREATE TABLE `review_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_activity_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `review_sessions_restaurant_idx` ON `review_sessions` (`restaurant_id`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`label` text NOT NULL,
	`prompt_descriptor` text NOT NULL,
	`sort_order` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topics_restaurant_label_uq` ON `topics` (`restaurant_id`,`label`);--> statement-breakpoint
CREATE INDEX `topics_restaurant_order_idx` ON `topics` (`restaurant_id`,`active`,`sort_order`);