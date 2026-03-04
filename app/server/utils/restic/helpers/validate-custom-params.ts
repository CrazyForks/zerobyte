const DENIED_FLAGS = new Set<string>([
	"--password-command",
	"--password-file",
	"--password",
	"-p",
	"--repository",
	"--repository-file",
	"-r",
	"--option",
	"-o",
	"--key-hint",
	"--tls-client-cert",
	"--cacert",
	"--repo",
]);

const ALLOWED_FLAGS = new Set<string>([
	"--verbose",
	"-v",
	"--no-scan",
	"--exclude-larger-than",
	"--skip-if-unchanged",
	"--exclude-caches",
	"--force",
	"--use-fs-snapshot",
	"--read-concurrency",
	"--ignore-ctime",
	"--ignore-inode",
	"--with-atime",
	"--no-cache",
	"--cleanup-cache",
	"--cache-dir",
	"--limit-upload",
	"--limit-download",
	"--pack-size",
	"--dry-run",
	"-n",
	"--no-lock",
	"--json",
]);

function extractFlagName(token: string): string | null {
	if (!token.startsWith("-")) {
		return null;
	}
	const eqIdx = token.indexOf("=");
	return eqIdx === -1 ? token : token.slice(0, eqIdx);
}

export function validateCustomResticParams(params: string[]): string | null {
	for (const param of params) {
		const tokens = param.trim().split(/\s+/).filter(Boolean);

		for (const token of tokens) {
			const flag = extractFlagName(token);
			if (flag === null) {
				continue;
			}

			if (DENIED_FLAGS.has(flag)) {
				return `Flag "${flag}" is not permitted in customResticParams`;
			}

			if (!ALLOWED_FLAGS.has(flag)) {
				return `Unknown or unsupported flag "${flag}" in customResticParams. Permitted flags: ${[...ALLOWED_FLAGS].join(", ")}`;
			}
		}
	}

	return null;
}
