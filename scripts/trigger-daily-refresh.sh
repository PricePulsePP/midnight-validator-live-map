#!/usr/bin/env bash
set -euo pipefail

OWNER="${GITHUB_OWNER:-PricePulsePP}"
REPO="${GITHUB_REPO:-midnight-validator-live-map}"
WORKFLOW="${GITHUB_WORKFLOW:-deploy.yml}"
REF="${GITHUB_REF:-main}"
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

if [[ -z "$TOKEN" ]]; then
  echo "Error: set GITHUB_TOKEN or GH_TOKEN to a GitHub token with Actions write access." >&2
  exit 1
fi

api_url="https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches"

http_status="$(
  curl --silent --show-error --output /dev/null --write-out "%{http_code}" \
    --request POST \
    --header "Accept: application/vnd.github+json" \
    --header "Authorization: Bearer ${TOKEN}" \
    --header "X-GitHub-Api-Version: 2022-11-28" \
    "$api_url" \
    --data "{\"ref\":\"${REF}\",\"inputs\":{\"requested_by\":\"linux-daily-script\"}}"
)"

if [[ "$http_status" != "204" ]]; then
  echo "Error: GitHub returned HTTP ${http_status} while dispatching ${WORKFLOW}." >&2
  exit 1
fi

echo "Triggered ${OWNER}/${REPO} workflow ${WORKFLOW} on ${REF}."
