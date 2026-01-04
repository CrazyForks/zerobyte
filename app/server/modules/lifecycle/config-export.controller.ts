import { validator } from "hono-openapi";
import { Hono } from "hono";
import type { Context } from "hono";
import {
	backupScheduleNotificationsTable,
	backupScheduleMirrorsTable,
	usersTable,
	type BackupSchedule,
	type BackupScheduleNotification,
	type BackupScheduleMirror,
	volumesTable,
	repositoriesTable,
	backupSchedulesTable,
	notificationDestinationsTable,
} from "../../db/schema";
import { db } from "../../db/db";
import { logger } from "../../utils/logger";
import { authService } from "../auth/auth.service";
import { fullExportBodySchema, fullExportDto, type FullExportBody } from "./config-export.dto";
import { requireAuth } from "../auth/auth.middleware";
import { toMessage } from "~/server/utils/errors";

const METADATA_KEYS = {
	timestamps: [
		"createdAt",
		"updatedAt",
		"lastBackupAt",
		"nextBackupAt",
		"lastHealthCheck",
		"lastChecked",
		"lastCopyAt",
	],
	runtimeState: [
		"status",
		"lastError",
		"lastBackupStatus",
		"lastBackupError",
		"hasDownloadedResticPassword",
		"lastCopyStatus",
		"lastCopyError",
		"sortOrder",
	],
};

const ALL_METADATA_KEYS = [...METADATA_KEYS.timestamps, ...METADATA_KEYS.runtimeState];

function filterMetadataOut<T extends Record<string, unknown>>(obj: T, includeMetadata: boolean): Partial<T> {
	if (includeMetadata) {
		return obj;
	}
	const result = { ...obj };
	for (const key of ALL_METADATA_KEYS) {
		delete result[key as keyof T];
	}
	return result;
}

async function verifyExportPassword(
	c: Context,
	password: string,
): Promise<{ valid: true; userId: number } | { valid: false; error: string }> {
	const user = c.get("user");
	if (!user) {
		return { valid: false, error: "Not authenticated" };
	}

	const isValid = await authService.verifyPassword(user.id, password);
	if (!isValid) {
		return { valid: false, error: "Incorrect password" };
	}

	return { valid: true, userId: user.id };
}

async function exportEntity(entity: Record<string, unknown>, params: FullExportBody) {
	return filterMetadataOut(entity, params.includeMetadata);
}

async function exportEntities<T extends Record<string, unknown>>(entities: T[], params: FullExportBody) {
	return Promise.all(entities.map((e) => exportEntity(e, params)));
}

const transformBackupSchedules = (
	schedules: BackupSchedule[],
	scheduleNotifications: BackupScheduleNotification[],
	scheduleMirrors: BackupScheduleMirror[],
	params: FullExportBody,
) => {
	return schedules.map((schedule) => {
		const assignments = scheduleNotifications
			.filter((sn) => sn.scheduleId === schedule.id)
			.map((sn) => filterMetadataOut(sn, params.includeMetadata));

		const mirrors = scheduleMirrors
			.filter((sm) => sm.scheduleId === schedule.id)
			.map((sm) => filterMetadataOut(sm, params.includeMetadata));

		return {
			...filterMetadataOut(schedule, params.includeMetadata),
			notifications: assignments,
			mirrors,
		};
	});
};

export const configExportController = new Hono()
	.use(requireAuth)
	.post("/export", fullExportDto, validator("json", fullExportBodySchema), async (c) => {
		try {
			const params = c.req.valid("json");

			const verification = await verifyExportPassword(c, params.password);
			if (!verification.valid) {
				return c.json({ error: verification.error }, 401);
			}

			const [volumes, repositories, backupSchedulesRaw, notifications, scheduleNotifications, scheduleMirrors, users] =
				await Promise.all([
					db.select().from(volumesTable),
					db.select().from(repositoriesTable),
					db.select().from(backupSchedulesTable),
					db.select().from(notificationDestinationsTable),
					db.select().from(backupScheduleNotificationsTable),
					db.select().from(backupScheduleMirrorsTable),
					db.select().from(usersTable),
				]);

			const backupSchedules = transformBackupSchedules(
				backupSchedulesRaw,
				scheduleNotifications,
				scheduleMirrors,
				params,
			);

			const [exportVolumes, exportRepositories, exportNotifications, exportUsers] = await Promise.all([
				exportEntities(volumes, params),
				exportEntities(repositories, params),
				exportEntities(notifications, params),
				exportEntities(users, params),
			]);

			return c.json({
				version: 1,
				exportedAt: new Date().toISOString(),
				volumes: exportVolumes,
				repositories: exportRepositories,
				backupSchedules,
				notificationDestinations: exportNotifications,
				users: exportUsers,
			});
		} catch (err) {
			logger.error(`Config export failed: ${toMessage(err)}`);
			return c.json({ error: toMessage(err) }, 500);
		}
	});
