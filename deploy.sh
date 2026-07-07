#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="butler-dispatch-system"
SSH_HOST="${SSH_HOST:-tencent-new}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_server}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
REMOTE_APP_ROOT="${REMOTE_APP_ROOT:-/opt/butler-dispatch-system}"
REMOTE_RELEASE_ROOT="${REMOTE_RELEASE_ROOT:-/data/app-releases/butler-dispatch-system}"
REMOTE_APP_USER="${REMOTE_APP_USER:-butlerapp}"
SERVICE_NAME="${SERVICE_NAME:-butler-dispatch-system}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/login}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-1}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
OVERDUE_ASSIGNMENTS_CRON="${OVERDUE_ASSIGNMENTS_CRON:-*-*-* 03:15:00}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_ID="$(date +%Y%m%d%H%M%S)"
REMOTE_UPLOAD_DIR="/tmp/${APP_NAME}-upload-${RELEASE_ID}"
REMOTE_RELEASE_DIR="${REMOTE_RELEASE_ROOT}/releases/${RELEASE_ID}"
REMOTE_CURRENT_LINK="${REMOTE_APP_ROOT}/current"
REMOTE_PREVIOUS_LINK="${REMOTE_APP_ROOT}/previous"

usage() {
  cat <<EOF
Usage: ./deploy.sh [options]

Options:
  --host <ssh-host>       SSH host alias or user@host. Default: ${SSH_HOST}
  --key <path>            SSH private key. Default: ${SSH_KEY}
  --no-migrate            Skip prisma migrate deploy.
  --health-url <url>      Health check URL. Default: ${HEALTH_URL}
  --keep <n>              Number of releases to keep. Default: ${KEEP_RELEASES}
  --overdue-cron <expr>   systemd OnCalendar for overdue assignment job. Default: ${OVERDUE_ASSIGNMENTS_CRON}
  -h, --help              Show help.

Environment overrides:
  SSH_HOST, SSH_KEY, REMOTE_APP_ROOT, REMOTE_RELEASE_ROOT, REMOTE_APP_USER,
  SERVICE_NAME, HEALTH_URL, RUN_MIGRATIONS, KEEP_RELEASES.
  OVERDUE_ASSIGNMENTS_CRON.
EOF
}

log() {
  printf '\033[1;34m[%s]\033[0m %s\n' "$(date '+%H:%M:%S')" "$*"
}

die() {
  printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      SSH_HOST="${2:?missing value for --host}"
      shift 2
      ;;
    --key)
      SSH_KEY="${2:?missing value for --key}"
      shift 2
      ;;
    --no-migrate)
      RUN_MIGRATIONS="0"
      shift
      ;;
    --health-url)
      HEALTH_URL="${2:?missing value for --health-url}"
      shift 2
      ;;
    --keep)
      KEEP_RELEASES="${2:?missing value for --keep}"
      shift 2
      ;;
    --overdue-cron)
      OVERDUE_ASSIGNMENTS_CRON="${2:?missing value for --overdue-cron}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown option: $1"
      ;;
  esac
done

[[ -f "${SSH_KEY}" ]] || die "SSH key not found: ${SSH_KEY}"
[[ -f "${SCRIPT_DIR}/package.json" ]] || die "run this script from the project root or keep it in the project root"
command -v rsync >/dev/null 2>&1 || die "rsync is required"
command -v ssh >/dev/null 2>&1 || die "ssh is required"

SSH=(ssh -i "${SSH_KEY}" -o BatchMode=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=3 "${SSH_HOST}")
RSYNC_RSH="ssh -i ${SSH_KEY} -o BatchMode=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=3"

remote() {
  "${SSH[@]}" "$@"
}

log "Running local production build check"
(cd "${SCRIPT_DIR}" && npm run build)

log "Preparing remote release ${RELEASE_ID}"
remote "mkdir -p '${REMOTE_UPLOAD_DIR}' '${REMOTE_RELEASE_ROOT}/releases' '${REMOTE_APP_ROOT}'"

log "Uploading source to ${SSH_HOST}:${REMOTE_UPLOAD_DIR}"
rsync -az --delete \
  -e "${RSYNC_RSH}" \
  --exclude '.git' \
  --exclude '.DS_Store' \
  --exclude '.env' \
  --exclude '.next' \
  --exclude 'node_modules' \
  --exclude 'tsconfig.tsbuildinfo' \
  --exclude 'miniprogram/**/*.js' \
  "${SCRIPT_DIR}/" "${SSH_HOST}:${REMOTE_UPLOAD_DIR}/"

log "Building release on server"
remote "bash -s" <<REMOTE
set -Eeuo pipefail

APP_ROOT='${REMOTE_APP_ROOT}'
APP_USER='${REMOTE_APP_USER}'
CURRENT_LINK='${REMOTE_CURRENT_LINK}'
PREVIOUS_LINK='${REMOTE_PREVIOUS_LINK}'
RELEASE_DIR='${REMOTE_RELEASE_DIR}'
UPLOAD_DIR='${REMOTE_UPLOAD_DIR}'
SERVICE_NAME='${SERVICE_NAME}'
RUN_MIGRATIONS='${RUN_MIGRATIONS}'
KEEP_RELEASES='${KEEP_RELEASES}'
HEALTH_URL='${HEALTH_URL}'
OVERDUE_ASSIGNMENTS_CRON='${OVERDUE_ASSIGNMENTS_CRON}'
migration_grants_enabled=0

revoke_runtime_grants() {
  if [ "\${migration_grants_enabled}" = "1" ]; then
    sudo mysql <<'SQL'
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'butler_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES ON butler_dispatch.* TO 'butler_app'@'localhost';
FLUSH PRIVILEGES;
SQL
    migration_grants_enabled=0
  fi
}

rollback() {
  echo "Deploy failed. Rolling back service pointer if possible..." >&2
  revoke_runtime_grants || true
  if [ -L "\${PREVIOUS_LINK}" ] && [ -d "\$(readlink -f "\${PREVIOUS_LINK}")" ]; then
    sudo ln -sfn "\$(readlink -f "\${PREVIOUS_LINK}")" "\${CURRENT_LINK}"
    sudo systemctl daemon-reload
    sudo systemctl restart "\${SERVICE_NAME}" || true
  fi
  sudo rm -rf "\${RELEASE_DIR}" "\${UPLOAD_DIR}" || true
}
trap rollback ERR

sudo mkdir -p "\${RELEASE_DIR}" "\${APP_ROOT}"
sudo chmod 755 \
  "\$(dirname "\$(dirname "\$(dirname "\${RELEASE_DIR}")")")" \
  "\$(dirname "\$(dirname "\${RELEASE_DIR}")")" \
  "\$(dirname "\${RELEASE_DIR}")"
sudo rsync -a --delete "\${UPLOAD_DIR}/" "\${RELEASE_DIR}/"

if [ -f "\${CURRENT_LINK}/.env" ]; then
  sudo install -o "\${APP_USER}" -g "\${APP_USER}" -m 600 "\${CURRENT_LINK}/.env" "\${RELEASE_DIR}/.env"
elif [ -f "\${APP_ROOT}/.env" ]; then
  sudo install -o "\${APP_USER}" -g "\${APP_USER}" -m 600 "\${APP_ROOT}/.env" "\${RELEASE_DIR}/.env"
else
  echo "Missing remote .env. Expected \${CURRENT_LINK}/.env or \${APP_ROOT}/.env" >&2
  exit 1
fi

sudo chown -R "\${APP_USER}:\${APP_USER}" "\${RELEASE_DIR}"

sudo -u "\${APP_USER}" -H bash -lc "cd '\${RELEASE_DIR}' && npm ci"

if [ "\${RUN_MIGRATIONS}" = "1" ]; then
  sudo mysql <<'SQL'
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON butler_dispatch.* TO 'butler_app'@'localhost';
FLUSH PRIVILEGES;
SQL
  migration_grants_enabled=1
  sudo -u "\${APP_USER}" -H bash -lc "cd '\${RELEASE_DIR}' && npx prisma migrate deploy"
  revoke_runtime_grants
fi

sudo -u "\${APP_USER}" -H bash -lc "cd '\${RELEASE_DIR}' && npm run build"

if [ -L "\${CURRENT_LINK}" ] && [ -d "\$(readlink -f "\${CURRENT_LINK}")" ]; then
  sudo ln -sfn "\$(readlink -f "\${CURRENT_LINK}")" "\${PREVIOUS_LINK}"
elif [ -d "\${APP_ROOT}" ] && [ ! -L "\${APP_ROOT}" ] && [ -f "\${APP_ROOT}/package.json" ]; then
  sudo mkdir -p "\${APP_ROOT}/legacy"
  sudo ln -sfn "\${APP_ROOT}" "\${PREVIOUS_LINK}"
fi

sudo ln -sfn "\${RELEASE_DIR}" "\${CURRENT_LINK}"

sudo install -m 0644 /dev/stdin "/etc/systemd/system/\${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Butler Dispatch System Next.js app
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=\${APP_USER}
WorkingDirectory=\${CURRENT_LINK}
EnvironmentFile=\${CURRENT_LINK}/.env
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Environment=NODE_OPTIONS=--max-old-space-size=768
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=full
ReadWritePaths=\${RELEASE_DIR} \${APP_ROOT}
MemoryHigh=1G
MemoryMax=1536M
TasksMax=128

[Install]
WantedBy=multi-user.target
EOF

sudo install -m 0644 /dev/stdin "/etc/systemd/system/\${SERVICE_NAME}-overdue-assignments.service" <<EOF
[Unit]
Description=Butler Dispatch System overdue assignment resolver
After=\${SERVICE_NAME}.service mysql.service
Wants=\${SERVICE_NAME}.service mysql.service

[Service]
Type=oneshot
User=\${APP_USER}
WorkingDirectory=\${CURRENT_LINK}
EnvironmentFile=\${CURRENT_LINK}/.env
ExecStart=/usr/bin/npm run cron:overdue-assignments
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=full
ReadWritePaths=\${RELEASE_DIR} \${APP_ROOT}

[Install]
WantedBy=multi-user.target
EOF

sudo install -m 0644 /dev/stdin "/etc/systemd/system/\${SERVICE_NAME}-overdue-assignments.timer" <<EOF
[Unit]
Description=Run Butler Dispatch overdue assignment resolver daily

[Timer]
OnCalendar=\${OVERDUE_ASSIGNMENTS_CRON}
Persistent=true
Unit=\${SERVICE_NAME}-overdue-assignments.service

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now "\${SERVICE_NAME}-overdue-assignments.timer"
sudo systemctl restart "\${SERVICE_NAME}"
sleep 3
sudo systemctl is-active --quiet "\${SERVICE_NAME}"

for attempt in 1 2 3 4 5; do
  if curl -fsS --max-time 10 "\${HEALTH_URL}" >/dev/null; then
    break
  fi
  if [ "\${attempt}" = "5" ]; then
    echo "Health check failed: \${HEALTH_URL}" >&2
    exit 1
  fi
  sleep 2
done

sudo find "\$(dirname "\${RELEASE_DIR}")" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +\$((KEEP_RELEASES + 1)) | xargs -r sudo rm -rf
rm -rf "\${UPLOAD_DIR}"

trap - ERR
echo "Release active: \${RELEASE_DIR}"
REMOTE

log "Deploy finished"
log "Health check: ${HEALTH_URL}"
