#!/usr/bin/env bash
set -Eeuo pipefail

REMOTE="origin"
BRANCH=""
MESSAGE=""
NO_PUSH=0
DRY_RUN=0
ALLOW_EMPTY=0

usage() {
  cat <<EOF
Usage: ./scripts/backup-to-github.sh [options]

Options:
  -m, --message <text>   Commit message. Default: Backup: YYYY-MM-DD HH:MM:SS
  -r, --remote <name>    Git remote name. Default: origin
  -b, --branch <name>    Branch to push. Default: current branch
  --no-push              Commit only, do not push.
  --dry-run              Show what would be backed up without changing files.
  --allow-empty          Create a backup commit even when there are no changes.
  -h, --help             Show help.

Examples:
  npm run backup
  npm run backup -- -m "Backup before deployment"
  ./scripts/backup-to-github.sh --dry-run
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
    -m|--message)
      MESSAGE="${2:?missing value for $1}"
      shift 2
      ;;
    -r|--remote)
      REMOTE="${2:?missing value for $1}"
      shift 2
      ;;
    -b|--branch)
      BRANCH="${2:?missing value for $1}"
      shift 2
      ;;
    --no-push)
      NO_PUSH=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --allow-empty)
      ALLOW_EMPTY=1
      shift
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

command -v git >/dev/null 2>&1 || die "git is required"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "not inside a git repository"
cd "${REPO_ROOT}"

git remote get-url "${REMOTE}" >/dev/null 2>&1 || die "git remote not found: ${REMOTE}"

if [[ -z "${BRANCH}" ]]; then
  BRANCH="$(git branch --show-current)"
fi

[[ -n "${BRANCH}" ]] || die "could not determine current branch; pass --branch <name>"

if [[ -z "${MESSAGE}" ]]; then
  MESSAGE="Backup: $(date '+%Y-%m-%d %H:%M:%S')"
fi

log "Repository: ${REPO_ROOT}"
log "Remote: ${REMOTE} ($(git remote get-url "${REMOTE}"))"
log "Branch: ${BRANCH}"

if [[ "${DRY_RUN}" = "1" ]]; then
  log "Dry run: showing current changes only"
  git status --short
  exit 0
fi

log "Staging tracked, untracked, and deleted files"
git add -A

if git diff --cached --quiet; then
  if [[ "${ALLOW_EMPTY}" = "1" ]]; then
    log "No file changes found; creating an empty backup commit"
    git commit --allow-empty -m "${MESSAGE}"
  else
    log "No file changes to commit"
  fi
else
  log "Creating backup commit"
  git commit -m "${MESSAGE}"
fi

if [[ "${NO_PUSH}" = "1" ]]; then
  log "Skipping push because --no-push was set"
  exit 0
fi

log "Pushing ${BRANCH} to ${REMOTE}/${BRANCH}"
git push -u "${REMOTE}" "${BRANCH}"

log "Backup complete"
