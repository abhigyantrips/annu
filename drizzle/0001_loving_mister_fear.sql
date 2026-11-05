PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_vitals` (
	`view_id` text NOT NULL,
	`metric` text NOT NULL,
	`value` real NOT NULL,
	PRIMARY KEY(`view_id`, `metric`),
	FOREIGN KEY (`view_id`) REFERENCES `pageviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_vitals`("view_id", "metric", "value") SELECT "view_id", "metric", "value" FROM `vitals`;--> statement-breakpoint
DROP TABLE `vitals`;--> statement-breakpoint
ALTER TABLE `__new_vitals` RENAME TO `vitals`;--> statement-breakpoint
PRAGMA foreign_keys=ON;