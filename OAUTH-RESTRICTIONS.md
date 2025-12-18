# OAuth Organization Access Restrictions

## Issue

If you see this error when trying to generate summaries:

```
⚠️ Skipping <org>/<repo>: Organization has OAuth App access restrictions enabled
```

This means the GitHub organization has restricted which OAuth applications can access their data.

## What This Means

- DevPulse cannot access repositories from organizations with OAuth restrictions
- Only **organization owners** can approve OAuth apps
- Your personal repositories will work fine
- Organization repos require additional approval

## Solution

### For Organization Owners

1. Go to your organization settings on GitHub
2. Navigate to **Settings** → **OAuth application policy**
3. Find "DevPulse" in the list (or the OAuth app name)
4. Click **Grant** to allow access

**Direct link format:**
```
https://github.com/organizations/<YOUR_ORG>/settings/oauth_application_policy
```

### For Organization Members

Contact your organization owner/admin and ask them to:
1. Approve the DevPulse OAuth application
2. Or disable OAuth App access restrictions (not recommended)

## Workaround

If you cannot get organization approval:

1. **Fork the repository** to your personal account
2. **Select your fork** instead of the org repo in DevPulse
3. Generate summaries from your fork

### Forking Steps:
```bash
# Select your personal fork instead
npm run repos list 1
npm run repos select <your_fork_id>
```

## What DevPulse Does

When it encounters a restricted repository, DevPulse will:
- ✓ Skip the repository gracefully
- ✓ Continue processing other repositories
- ✓ Show a warning in the logs
- ✓ Not crash or fail the entire job

## Example Output

```
--- Processing: webmonitoring/ping-caster ---
⚠️  Skipping webmonitoring/ping-caster: Organization has OAuth App access restrictions enabled
   To fix: The organization owner needs to approve this OAuth app in organization settings
   See: https://docs.github.com/articles/restricting-access-to-your-organization-s-data/

--- Processing: TianqiCS/my-repo ---
✓ Completed ingestion for TianqiCS/my-repo

=== Ingestion Complete ===
Results:
  ✓ Success: 2
  ⚠️  Skipped: 1 (OAuth restrictions)
```

## Prevention

When selecting repositories, prefer:
- ✅ Your own personal repositories
- ✅ Organization repos where you're an owner
- ✅ Public repos from orgs that allow all OAuth apps
- ❌ Organization repos with strict OAuth policies (unless approved)

## More Information

- [GitHub Docs: OAuth App Access Restrictions](https://docs.github.com/articles/restricting-access-to-your-organization-s-data/)
- [Approving OAuth Apps for Your Organization](https://docs.github.com/organizations/restricting-access-to-your-organizations-data/approving-oauth-apps-for-your-organization)
