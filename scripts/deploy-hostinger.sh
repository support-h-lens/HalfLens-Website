#!/usr/bin/env bash
set -euo pipefail

: "${HOSTINGER_SSH_HOST:?HOSTINGER_SSH_HOST is required}"
: "${HOSTINGER_SSH_PORT:?HOSTINGER_SSH_PORT is required}"
: "${HOSTINGER_SSH_USER:?HOSTINGER_SSH_USER is required}"
: "${HOSTINGER_PRODUCTION_LINK:?HOSTINGER_PRODUCTION_LINK is required}"
: "${HOSTINGER_RELEASES_DIR:?HOSTINGER_RELEASES_DIR is required}"
: "${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"

case "$HOSTINGER_PRODUCTION_LINK" in
  /*) ;;
  *) echo "HOSTINGER_PRODUCTION_LINK must be an absolute path." >&2; exit 2 ;;
esac
case "$HOSTINGER_RELEASES_DIR" in
  /|/home|/home/|"") echo "HOSTINGER_RELEASES_DIR is too broad." >&2; exit 2 ;;
  /*) ;;
  *) echo "HOSTINGER_RELEASES_DIR must be an absolute path." >&2; exit 2 ;;
esac

release_name="${GITHUB_SHA:0:12}-${GITHUB_RUN_ID}"
release_path="${HOSTINGER_RELEASES_DIR%/}/${release_name}"
ssh_target="${HOSTINGER_SSH_USER}@${HOSTINGER_SSH_HOST}"
ssh_options=(-p "$HOSTINGER_SSH_PORT" -o BatchMode=yes -o StrictHostKeyChecking=yes)

ssh "${ssh_options[@]}" "$ssh_target" bash -s -- "$release_path" <<'REMOTE_PREPARE'
set -euo pipefail
release_path="$1"
mkdir -p "$release_path"
REMOTE_PREPARE

rsync -az --delete -e "ssh -p ${HOSTINGER_SSH_PORT} -o BatchMode=yes -o StrictHostKeyChecking=yes" dist/ "${ssh_target}:${release_path}/"

ssh "${ssh_options[@]}" "$ssh_target" bash -s -- "$release_path" "$HOSTINGER_PRODUCTION_LINK" <<'REMOTE_ACTIVATE'
set -euo pipefail
release_path="$1"
production_link="$2"
test -f "$release_path/index.html"
test -f "$release_path/.htaccess"
test -f "$release_path/sitemap.xml"
if [ -e "$production_link" ] && [ ! -L "$production_link" ]; then
  echo "Production target exists but is not a symlink; refusing to replace it." >&2
  exit 3
fi
temporary_link="${production_link}.next"
ln -sfn "$release_path" "$temporary_link"
mv -Tf "$temporary_link" "$production_link"
REMOTE_ACTIVATE

echo "Activated Hostinger release ${release_name}."
