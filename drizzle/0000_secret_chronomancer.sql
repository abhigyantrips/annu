CREATE TABLE `clicks` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`visit_id` text NOT NULL,
	`view_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`path` text NOT NULL,
	`destination` text NOT NULL,
	`kind` text NOT NULL,
	`at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`view_id`) REFERENCES `pageviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `clicks_site_time` ON `clicks` (`site_id`,`at`);--> statement-breakpoint
CREATE INDEX `clicks_view` ON `clicks` (`view_id`);--> statement-breakpoint
CREATE TABLE `label_values` (
	`site_id` text NOT NULL,
	`dimension` text NOT NULL,
	`value` text NOT NULL,
	`label_id` text NOT NULL,
	PRIMARY KEY(`site_id`, `dimension`, `value`),
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`dimension` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `labels_name` ON `labels` (`site_id`,`dimension`,`name`);--> statement-breakpoint
CREATE TABLE `pageviews` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`visit_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`path` text NOT NULL,
	`title` text NOT NULL,
	`started_at` integer NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`checkpoint_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pageviews_site_time` ON `pageviews` (`site_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `pageviews_visit_path` ON `pageviews` (`visit_id`,`path`);--> statement-breakpoint
CREATE INDEX `pageviews_visitor` ON `pageviews` (`site_id`,`visitor_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`domains` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visitors` (
	`site_id` text NOT NULL,
	`id` text NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	PRIMARY KEY(`site_id`, `id`),
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `visitors_last_seen` ON `visitors` (`site_id`,`last_seen`);--> statement-breakpoint
CREATE TABLE `visits` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`referrer` text,
	`country` text,
	`region` text,
	`city` text,
	`source` text,
	`medium` text,
	`campaign` text,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `visits_identity` ON `visits` (`site_id`,`visitor_id`,`last_seen`);--> statement-breakpoint
CREATE INDEX `visits_started` ON `visits` (`site_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `vitals` (
	`view_id` text NOT NULL,
	`metric` text NOT NULL,
	`value` integer NOT NULL,
	PRIMARY KEY(`view_id`, `metric`),
	FOREIGN KEY (`view_id`) REFERENCES `pageviews`(`id`) ON UPDATE no action ON DELETE cascade
);
