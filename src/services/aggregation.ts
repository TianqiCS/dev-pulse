import { getActivitiesByRepoAndDateRange, EventType } from '../models/activity';

export interface ActivityStats {
  totalActivities: number;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  prsClosed: number;
  reviews: number;
  prComments: number;
  ciSuccesses: number;
  ciFailures: number;
  issuesOpened: number;
  issuesClosed: number;
  issueComments: number;
}

export interface AggregatedActivity {
  event_type: EventType;
  count: number;
  items: any[];
}

export interface WeeklyActivityData {
  repoId: number;
  repoName: string;
  weekStart: Date;
  weekEnd: Date;
  stats: ActivityStats;
  activities: {
    commits: any[];
    prsOpened: any[];
    prsMerged: any[];
    prsClosed: any[];
    reviews: any[];
    ciFailures: any[];
    issuesOpened: any[];
    issuesClosed: any[];
  };
  contributors: string[];
}

export async function aggregateWeeklyActivity(
  repo: { id: number; full_name: string }
): Promise<WeeklyActivityData> {
  // Calculate current week (last 7 days)
  const weekEnd = new Date();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const activities = await getActivitiesByRepoAndDateRange(repo.id, weekStart, weekEnd);

  const stats: ActivityStats = {
    totalActivities: activities.length,
    commits: 0,
    prsOpened: 0,
    prsMerged: 0,
    prsClosed: 0,
    reviews: 0,
    prComments: 0,
    ciSuccesses: 0,
    ciFailures: 0,
    issuesOpened: 0,
    issuesClosed: 0,
    issueComments: 0,
  };

  const commits: any[] = [];
  const prsOpened: any[] = [];
  const prsMerged: any[] = [];
  const prsClosed: any[] = [];
  const reviews: any[] = [];
  const ciFailures: any[] = [];
  const issuesOpened: any[] = [];
  const issuesClosed: any[] = [];
  const contributors = new Set<string>();

  for (const activity of activities) {
    contributors.add(activity.author);

    switch (activity.event_type) {
      case 'commit':
        stats.commits++;
        commits.push({
          sha: activity.raw_payload.sha?.substring(0, 7),
          author: activity.author,
          message: activity.raw_payload.message,
          timestamp: activity.timestamp,
        });
        break;

      case 'pr_opened':
        stats.prsOpened++;
        prsOpened.push({
          number: activity.raw_payload.pr_number,
          title: activity.raw_payload.title,
          author: activity.author,
          timestamp: activity.timestamp,
        });
        break;

      case 'pr_merged':
        stats.prsMerged++;
        prsMerged.push({
          number: activity.raw_payload.pr_number,
          title: activity.raw_payload.title,
          author: activity.author,
          timestamp: activity.timestamp,
        });
        break;

      case 'pr_closed':
        stats.prsClosed++;
        prsClosed.push({
          number: activity.raw_payload.pr_number,
          title: activity.raw_payload.title,
          author: activity.author,
          timestamp: activity.timestamp,
        });
        break;

      case 'pr_review':
        stats.reviews++;
        reviews.push({
          prNumber: activity.raw_payload.pr_number,
          reviewer: activity.author,
          state: activity.raw_payload.state,
          timestamp: activity.timestamp,
        });
        break;

      case 'pr_comment':
        stats.prComments++;
        break;

      case 'ci_success':
        stats.ciSuccesses++;
        break;

      case 'ci_failure':
        stats.ciFailures++;
        ciFailures.push({
          checkName: activity.raw_payload.check_name || activity.raw_payload.context,
          conclusion: activity.raw_payload.conclusion || activity.raw_payload.state,
          commitSha: activity.raw_payload.commit_sha?.substring(0, 7),
          timestamp: activity.timestamp,
        });
        break;

      case 'issue_opened':
        stats.issuesOpened++;
        issuesOpened.push({
          number: activity.raw_payload.issue_number,
          title: activity.raw_payload.title,
          author: activity.author,
          timestamp: activity.timestamp,
        });
        break;

      case 'issue_closed':
        stats.issuesClosed++;
        issuesClosed.push({
          number: activity.raw_payload.issue_number,
          title: activity.raw_payload.title,
          author: activity.author,
          timestamp: activity.timestamp,
        });
        break;

      case 'issue_comment':
        stats.issueComments++;
        break;
    }
  }

  return {
    repoId: repo.id,
    repoName: repo.full_name,
    weekStart,
    weekEnd,
    stats,
    activities: {
      commits,
      prsOpened,
      prsMerged,
      prsClosed,
      reviews,
      ciFailures,
      issuesOpened,
      issuesClosed,
    },
    contributors: Array.from(contributors),
  };
}

// Legacy function for backward compatibility
export async function aggregateWeeklyActivityByPeriod(
  repoId: number,
  repoName: string,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyActivityData> {
  const activities = await getActivitiesByRepoAndDateRange(repoId, weekStart, weekEnd);

  const stats: ActivityStats = {
    totalActivities: activities.length,
    commits: 0,
    prsOpened: 0,
    prsMerged: 0,
    prsClosed: 0,
    reviews: 0,
    prComments: 0,
    ciSuccesses: 0,
    ciFailures: 0,
    issuesOpened: 0,
    issuesClosed: 0,
    issueComments: 0,
  };

  const commits: any[] = [];
  const prsOpened: any[] = [];
  const prsMerged: any[] = [];
  const prsClosed: any[] = [];
  const reviews: any[] = [];
  const ciFailures: any[] = [];
  const issuesOpened: any[] = [];
  const issuesClosed: any[] = [];
  const contributors = new Set<string>();

  for (const activity of activities) {
    contributors.add(activity.author);

    switch (activity.event_type) {
      case 'commit':
        stats.commits++;
        commits.push({
          sha: activity.raw_payload.sha?.substring(0, 7),
          author: activity.author,
          message: activity.raw_payload.message,
          timestamp: activity.timestamp,
        });
        break;

      case 'pr_opened':
        stats.prsOpened++;
        prsOpened.push({
          number: activity.raw_payload.pr_number,
          title: activity.raw_payload.title,
          author: activity.author,
          timestamp: activity.timestamp,
        });
        break;

      case 'pr_merged':
        stats.prsMerged++;
        prsMerged.push({
          number: activity.raw_payload.pr_number,
          title: activity.raw_payload.title,
          author: activity.author,
          timestamp: activity.timestamp,
        });
        break;

      case 'pr_closed':
        stats.prsClosed++;
        prsClosed.push({
          number: activity.raw_payload.pr_number,
          title: activity.raw_payload.title,
          author: activity.author,
          timestamp: activity.timestamp,
        });
        break;

      case 'pr_review':
        stats.reviews++;
        reviews.push({
          prNumber: activity.raw_payload.pr_number,
          reviewer: activity.author,
          state: activity.raw_payload.state,
          timestamp: activity.timestamp,
        });
        break;

      case 'pr_comment':
        stats.prComments++;
        break;

      case 'ci_success':
        stats.ciSuccesses++;
        break;

      case 'ci_failure':
        stats.ciFailures++;
        ciFailures.push({
          checkName: activity.raw_payload.check_name || activity.raw_payload.context,
          conclusion: activity.raw_payload.conclusion || activity.raw_payload.state,
          commitSha: activity.raw_payload.commit_sha?.substring(0, 7),
          timestamp: activity.timestamp,
        });
        break;

      case 'issue_opened':
        stats.issuesOpened++;
        issuesOpened.push({
          number: activity.raw_payload.issue_number,
          title: activity.raw_payload.title,
          author: activity.author,
          timestamp: activity.timestamp,
        });
        break;

      case 'issue_closed':
        stats.issuesClosed++;
        issuesClosed.push({
          number: activity.raw_payload.issue_number,
          title: activity.raw_payload.title,
          author: activity.author,
          timestamp: activity.timestamp,
        });
        break;

      case 'issue_comment':
        stats.issueComments++;
        break;
    }
  }

  return {
    repoId,
    repoName,
    weekStart,
    weekEnd,
    stats,
    activities: {
      commits,
      prsOpened,
      prsMerged,
      prsClosed,
      reviews,
      ciFailures,
      issuesOpened,
      issuesClosed,
    },
    contributors: Array.from(contributors),
  };
}
