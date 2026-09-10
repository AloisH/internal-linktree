#!/usr/bin/env bash
# just release <major|minor|patch>
# Computes the next version from existing git tags, creates the tag, pushes it.
# The tag push triggers release.yml (build + push to GHCR + GitHub Release).
set -euo pipefail

bump="${1:?usage: release.sh <major|minor|patch>}"

git fetch --tags --quiet

last=$(git tag --list "v[0-9]*" --sort=-v:refname | head -1)
version="${last#v}"
version="${version:-0.0.0}"

IFS=. read -r major minor patch <<<"$version"
case "$bump" in
  major) major=$((major + 1)); minor=0; patch=0 ;;
  minor) minor=$((minor + 1)); patch=0 ;;
  patch) patch=$((patch + 1)) ;;
  *) echo "bump must be major, minor or patch" >&2; exit 1 ;;
esac

tag="v${major}.${minor}.${patch}"
echo "tagging ${tag} (previous: ${last:-none})"
git tag -a "$tag" -m "release ${tag}"
git push origin "$tag"
echo "pushed — the release workflow takes it from here"
