import { Await, redirect } from "react-router";
import { getBackupSchedule, getRepository, getSnapshotDetails } from "~/client/api-client";
import { RestoreForm } from "~/client/components/restore-form";
import type { Route } from "./+types/restore-snapshot";
import { Suspense } from "react";

export const handle = {
	breadcrumb: (match: Route.MetaArgs) => [
		{ label: "Backups", href: "/backups" },
		{ label: `Schedule #${match.params.id}`, href: `/backups/${match.params.id}` },
		{ label: match.params.snapshotId },
		{ label: "Restore" },
	],
};

export function meta({ params }: Route.MetaArgs) {
	return [
		{ title: `Zerobyte - Restore Snapshot ${params.snapshotId}` },
		{
			name: "description",
			content: "Restore files from a backup snapshot.",
		},
	];
}

export const clientLoader = async ({ params }: Route.ClientLoaderArgs) => {
	const schedule = await getBackupSchedule({ path: { scheduleId: params.id } });
	if (!schedule.data) return redirect("/backups");

	const repositoryId = schedule.data.repository.id;
	const snapshot = getSnapshotDetails({
		path: { id: repositoryId, snapshotId: params.snapshotId },
	});

	const repository = await getRepository({ path: { id: repositoryId } });
	if (!repository.data) return redirect(`/backups/${params.id}`);

	return {
		snapshot: snapshot,
		repository: repository.data,
		snapshotId: params.snapshotId,
		backupId: params.id,
	};
};

export default function RestoreSnapshotFromBackupPage({ loaderData }: Route.ComponentProps) {
	const { repository, snapshotId, backupId } = loaderData;

	return (
		<Suspense fallback={<p>Loading snapshot details...</p>}>
			<Await resolve={loaderData.snapshot}>
				{(value) => {
					if (!value.data) return <div className="text-destructive">Snapshot data not found.</div>;

					return (
						<RestoreForm
							snapshot={value.data}
							repository={repository}
							snapshotId={snapshotId}
							returnPath={`/backups/${backupId}`}
						/>
					);
				}}
			</Await>
		</Suspense>
	);
}
