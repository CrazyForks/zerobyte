import { describe, expect, it, beforeAll } from "bun:test";
import { makeSmbBackend } from "../../../server/modules/backends/smb/smb-backend";
import { BACKEND_STATUS } from "../../../schemas/volumes";
import * as fs from "node:fs/promises";

describe("SMB Backend Integration", () => {
	const mountPath = "/tmp/test-mount-smb";

	const config = {
		backend: "smb" as const,
		server: "smb-server",
		share: "testshare",
		username: "testuser",
		password: "testpass",
		vers: "3.0" as const,
		port: 445,
	};

	beforeAll(async () => {
		await fs.rm(mountPath, { recursive: true, force: true }).catch(() => {});
	});

	it("should mount, check health, and unmount successfully", async () => {
		const backend = makeSmbBackend(config, mountPath);

		// 1. Mount
		const mountResult = await backend.mount();
		expect(mountResult.status).toBe(BACKEND_STATUS.mounted);

		// 2. Health Check
		const healthResult = await backend.checkHealth();
		expect(healthResult.status).toBe(BACKEND_STATUS.mounted);

		// 3. Write/Read test (Verify it's actually usable)
		const testFile = `${mountPath}/test-file-${Date.now()}.txt`;
		await fs.writeFile(testFile, "hello from integration test");
		const content = await fs.readFile(testFile, "utf-8");
		expect(content).toBe("hello from integration test");

		// 4. Unmount
		const unmountResult = await backend.unmount();
		expect(unmountResult.status).toBe(BACKEND_STATUS.unmounted);

		// 5. Verify unmounted
		const postUnmountHealth = await backend.checkHealth();
		expect(postUnmountHealth.status).toBe(BACKEND_STATUS.error);
	});
});
