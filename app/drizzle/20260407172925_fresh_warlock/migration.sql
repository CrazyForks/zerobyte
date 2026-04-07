ALTER TABLE `backup_schedules_table` ADD `failure_retry_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `backup_schedules_table` ADD `max_retries` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `backup_schedules_table` ADD `retry_delay` integer DEFAULT 3600000 NOT NULL;