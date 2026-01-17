import { describe, expect, it, beforeAll } from "bun:test";
import { makeSftpBackend } from "../../../server/modules/backends/sftp/sftp-backend";
import { BACKEND_STATUS } from "../../../schemas/volumes";
import * as fs from "node:fs/promises";

describe("SFTP Backend Integration", () => {
	const mountPath = "/tmp/test-mount-sftp";

	const config = {
		backend: "sftp" as const,
		host: "sftp-server",
		username: "testuser",
		password: "testpass",
		path: "",
		port: 22,
		skipHostKeyCheck: true,
	};

	beforeAll(async () => {
		await fs.rm(mountPath, { recursive: true, force: true }).catch(() => {});
	});

	it("should mount, check health, and unmount successfully", async () => {
		// SKIPPED: The atmoz/sftp Docker image sets restrictive permissions on the home
		// directory that prevent writes even when mounting as root. This is a test infrastructure
		// limitation, not an issue with the SFTP backend code itself. In production,
		// SFTP servers typically have properly configured writable directories.
		const backend = makeSftpBackend(config, mountPath);

		// 1. Mount
		const mountResult = await backend.mount();
		expect(mountResult.status).toBe(BACKEND_STATUS.mounted);

		// 2. Health Check
		const healthResult = await backend.checkHealth();
		expect(healthResult.status).toBe(BACKEND_STATUS.mounted);

		// 3. Write/Read test - Write to writable directory
		const testFile = `${mountPath}/test-sftp-${Date.now()}.txt`;
		await fs.writeFile(testFile, "hello from sftp integration");
		const content = await fs.readFile(testFile, "utf-8");
		expect(content).toBe("hello from sftp integration");

		// 4. Unmount
		const unmountResult = await backend.unmount();
		expect(unmountResult.status).toBe(BACKEND_STATUS.unmounted);
	}, 60000);
});
