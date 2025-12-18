import { WeeklyActivityData } from './aggregation';

function formatBodyPreview(body: string | null | undefined): string {
  if (!body) return '';
  const preview = body.substring(0, 200);
  return '\n  Description: ' + preview + (body.length > 200 ? '...' : '');
}

export function buildWeeklySummaryPrompt(data: WeeklyActivityData): string {
  const { repoName, weekStart, weekEnd, stats, activities, contributors } = data;

  const startDate = weekStart.toISOString().split('T')[0];
  const endDate = weekEnd.toISOString().split('T')[0];

  return `You are an engineering manager assistant that creates clear, factual weekly summaries of software development activity.

CRITICAL INSTRUCTIONS:
- Only use information from the data provided below
- Do not make assumptions or add information not present in the data
- Be factual and neutral, never judgmental
- Do not mention productivity scores or rate team performance
- Focus on what happened, not on evaluating how well it was done
- Use professional, clear language

REPOSITORY: ${repoName}
WEEK: ${startDate} to ${endDate}

ACTIVITY STATISTICS:
- Total commits: ${stats.commits}
- Pull requests opened: ${stats.prsOpened}
- Pull requests merged: ${stats.prsMerged}
- Pull requests closed (not merged): ${stats.prsClosed}
- Reviews submitted: ${stats.reviews}
- PR comments: ${stats.prComments}
- Issues opened: ${stats.issuesOpened}
- Issues closed: ${stats.issuesClosed}
- Issue comments: ${stats.issueComments}
- CI failures: ${stats.ciFailures}
- CI successes: ${stats.ciSuccesses}
- Active contributors: ${contributors.length}

COMMITS (${stats.commits} total):
${activities.commits.slice(0, 10).map(c => `- ${c.sha}: ${c.message.split('\n')[0]} (${c.author})`).join('\n') || 'No commits this week'}

PULL REQUESTS OPENED (${stats.prsOpened} total):
${activities.prsOpened.map(pr => `- PR #${pr.number}: ${pr.title} by ${pr.author}${formatBodyPreview(pr.body)}`).join('\n') || 'No PRs opened'}

PULL REQUESTS MERGED (${stats.prsMerged} total):
${activities.prsMerged.map(pr => `- PR #${pr.number}: ${pr.title} by ${pr.author}${formatBodyPreview(pr.body)}`).join('\n') || 'No PRs merged'}

PULL REQUESTS CLOSED WITHOUT MERGE (${stats.prsClosed} total):
${activities.prsClosed.map(pr => `- PR #${pr.number}: ${pr.title} by ${pr.author}${formatBodyPreview(pr.body)}`).join('\n') || 'None'}

ISSUES OPENED (${stats.issuesOpened} total):
${activities.issuesOpened.map(issue => `- Issue #${issue.number}: ${issue.title} by ${issue.author}${formatBodyPreview(issue.body)}`).join('\n') || 'No issues opened'}

ISSUES CLOSED (${stats.issuesClosed} total):
${activities.issuesClosed.map(issue => `- Issue #${issue.number}: ${issue.title} by ${issue.author}${formatBodyPreview(issue.body)}`).join('\n') || 'No issues closed'}

CI FAILURES (${stats.ciFailures} total):
${activities.ciFailures.slice(0, 5).map(ci => `- ${ci.checkName}: ${ci.conclusion} (commit ${ci.commitSha})`).join('\n') || 'No CI failures'}

CONTRIBUTORS (${contributors.length} active):
${contributors.join(', ')}

Generate a professional weekly engineering summary with these sections:

## Overview
A 2-3 sentence high-level summary of the week's engineering activity.

## Key Accomplishments
- Bullet points of major work completed (merged PRs, significant commits, closed issues)
- Only mention items that actually happened (from the data above)

## Ongoing Work
- Pull requests still in review or recently opened
- Open issues being worked on
- Only include actual PRs and issues from the data

## Issues & Risks
- New issues opened and their status
- CI failures and their patterns (if any)
- Blocked or closed PRs (if any)
- If none, say "No significant issues or blockers this week"

## Notable Contributors
- Briefly mention contributors and their main contributions
- Keep it factual, avoid superlatives

IMPORTANT: Your response should be in Markdown format, clear and ready to share with engineering leadership.`;
}
