import { type } from "arktype";
import { describeRoute, resolver } from "hono-openapi";

export const fullExportBodySchema = type({
	includeMetadata: "boolean = false",
	password: "string",
});

export type FullExportBody = typeof fullExportBodySchema.infer;

const exportResponseSchema = type({
	version: "number",
	exportedAt: "string?",
	recoveryKey: "string?",
	volumes: "unknown[]?",
	repositories: "unknown[]?",
	backupSchedules: "unknown[]?",
	notificationDestinations: "unknown[]?",
	users: type({
		id: "number?",
		username: "string",
		passwordHash: "string?",
		createdAt: "number?",
		updatedAt: "number?",
		hasDownloadedResticPassword: "boolean?",
	})
		.array()
		.optional(),
});

const errorResponseSchema = type({
	error: "string",
});

export const fullExportDto = describeRoute({
	description: "Export full configuration including all volumes, repositories, backup schedules, and notifications",
	operationId: "exportFullConfig",
	tags: ["Config Export"],
	responses: {
		200: {
			description: "Full configuration export",
			content: {
				"application/json": {
					schema: resolver(exportResponseSchema),
				},
			},
		},
		401: {
			description: "Password required for export or authentication failed",
			content: {
				"application/json": {
					schema: resolver(errorResponseSchema),
				},
			},
		},
		500: {
			description: "Export failed",
			content: {
				"application/json": {
					schema: resolver(errorResponseSchema),
				},
			},
		},
	},
});
