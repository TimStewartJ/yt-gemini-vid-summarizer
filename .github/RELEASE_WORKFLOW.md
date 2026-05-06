# Release workflow

This repo uses a two-step release process so humans and agents can prepare releases without directly editing `manifest.json` by hand, while AMO publishing remains tied to a committed and tagged version.

## 1. Prepare a release PR

Trigger the workflow with structured inputs:

```bash
gh workflow run prepare-release.yml \
  --ref main \
  -f bump=patch \
  -f release_notes="Release notes for AMO and GitHub."
```

Valid `bump` values:

| Bump | Example |
| --- | --- |
| `patch` | `1.5.0` -> `1.5.1` |
| `minor` | `1.5.0` -> `1.6.0` |
| `major` | `1.5.0` -> `2.0.0` |

The workflow normalizes two-part versions like `1.5` into three-part releases when bumping, so the next patch release is `1.5.1`.

Monitor the workflow:

```bash
RUN_ID=$(gh run list \
  --workflow "Prepare Release" \
  --event workflow_dispatch \
  --limit 1 \
  --json databaseId \
  --jq '.[0].databaseId')

gh run watch "$RUN_ID" --exit-status
```

Find the release PR:

```bash
gh pr list \
  --state open \
  --base main \
  --json number,title,headRefName,url \
  --jq '.[] | select(.headRefName | startswith("release/v"))'
```

The release PR includes:

- `manifest.json` version bump
- `release-notes/vX.Y.Z.md` when release notes were provided

## 2. Merge the release PR

Review the release PR, then merge it:

```bash
gh pr merge <pr-number> --squash --delete-branch
```

## 3. Publish from an annotated tag

After the release PR is merged:

```bash
git fetch origin main
git switch main
git pull --ff-only origin main
VERSION=$(python3 -c 'import json; print(json.load(open("manifest.json", encoding="utf-8"))["version"])')
git tag -a "v${VERSION}" -m "Release v${VERSION}"
git push origin "v${VERSION}"
```

The `Package Firefox Extension` workflow publishes to AMO only from `v*` tags. It verifies:

- the tag name matches `manifest.json.version`
- the tag is annotated
- the tagged commit is already on `origin/main`
- AMO credentials are configured as GitHub Actions secrets

Monitor publishing:

```bash
RUN_ID=$(gh run list \
  --workflow "Package Firefox Extension" \
  --event push \
  --limit 1 \
  --json databaseId \
  --jq '.[0].databaseId')

gh run watch "$RUN_ID" --exit-status
```

If AMO accepts the submission but the listed version is still pending review, the workflow can complete without a signed artifact. The AMO listing remains the source of truth for public availability.

## Required secrets

Add these repository secrets before publishing:

- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`
