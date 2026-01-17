#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Starting integration sandbox..."
docker compose up -d --build

while ! docker compose exec tester nc -z smb-server 445; do
	echo "Waiting for SMB..."
	sleep 2
done

while ! docker compose exec tester nc -z nfs-server 2049; do
	echo "Waiting for NFS..."
	sleep 2
done

while ! docker compose exec tester nc -z webdav-server 80; do
	echo "Waiting for WebDAV..."
	sleep 2
done

while ! docker compose exec tester nc -z sftp-server 22; do
	echo "Waiting for SFTP..."
	sleep 2
done

sleep 5

docker compose exec tester bun test --timeout 30000 ./app/test/integration/backends/

docker compose down
