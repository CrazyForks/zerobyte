import type { NotificationConfig } from "~/schemas/notifications";

export function buildGotifyShoutrrrUrl(config: Extract<NotificationConfig, { type: "gotify" }>): string {
	const url = new URL(config.serverUrl);
	const hostname = url.hostname;
	const port = url.port ? `:${url.port}` : "";
	const path = config.path ? `/${config.path.replace(/^\/+|\/+$/g, "")}` : "";

	let shoutrrrUrl = `gotify://${hostname}${port}${path}/${config.token}`;

	if (config.priority !== undefined) {
		shoutrrrUrl += `?priority=${config.priority}`;
	}

	return shoutrrrUrl;
}
