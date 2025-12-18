import { Octokit } from '@octokit/rest';
import { Repository } from '../models/repository';
import { createActivity, EventType } from '../models/activity';

export class GitHubService {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async getUserRepositories() {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
    });
    return data;
  }

  async ingestRepositoryActivity(repo: Repository, daysBack: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    console.log(`Ingesting activity for ${repo.full_name} since ${since.toISOString()}`);

    try {
      // Ingest commits
      await this.ingestCommits(repo, since);

      // Ingest pull requests
      await this.ingestPullRequests(repo, since);

      // Ingest PR reviews
      await this.ingestPullRequestReviews(repo, since);

      // Ingest issues
      await this.ingestIssues(repo, since);

      // Ingest CI status
      await this.ingestCIStatus(repo, since);

      console.log(`✓ Completed ingestion for ${repo.full_name}`);
    } catch (error: any) {
      if (error.status === 403 && error.message?.includes('organization has enabled OAuth App access restrictions')) {
        console.warn(`⚠️  Skipping ${repo.full_name}: Organization has OAuth App access restrictions enabled`);
        console.warn(`   To fix: The organization owner needs to approve this OAuth app in organization settings`);
        console.warn(`   See: https://docs.github.com/articles/restricting-access-to-your-organization-s-data/`);
      } else {
        console.error(`✗ Error ingesting ${repo.full_name}:`, error.message);
        throw error;
      }
    }
  }

  private async ingestCommits(repo: Repository, since: Date) {
    try {
      const { data: commits } = await this.octokit.repos.listCommits({
        owner: repo.owner,
        repo: repo.name,
        since: since.toISOString(),
        per_page: 100,
      });

      console.log(`Found ${commits.length} commits`);

      for (const commit of commits) {
        await createActivity(
          repo.id,
          'commit',
          commit.sha,
          commit.commit.author?.name || commit.commit.author?.email || 'unknown',
          new Date(commit.commit.author?.date || new Date()),
          {
            sha: commit.sha,
            message: commit.commit.message,
            url: commit.html_url,
            author: commit.commit.author,
            committer: commit.commit.committer,
          }
        );
      }
    } catch (error) {
      console.error(`Error ingesting commits for ${repo.full_name}:`, error);
    }
  }

  private async ingestPullRequests(repo: Repository, since: Date) {
    try {
      // Get closed PRs
      const { data: closedPRs } = await this.octokit.pulls.list({
        owner: repo.owner,
        repo: repo.name,
        state: 'closed',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });

      // Get open PRs
      const { data: openPRs } = await this.octokit.pulls.list({
        owner: repo.owner,
        repo: repo.name,
        state: 'open',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });

      const allPRs = [...closedPRs, ...openPRs];
      console.log(`Found ${allPRs.length} pull requests`);

      for (const pr of allPRs) {
        const updatedAt = new Date(pr.updated_at);
        if (updatedAt < since) continue;

        // PR opened event
        const createdAt = new Date(pr.created_at);
        if (createdAt >= since) {
          await createActivity(
            repo.id,
            'pr_opened',
            `pr_opened_${pr.id}`,
            pr.user?.login || 'unknown',
            createdAt,
            {
              pr_number: pr.number,
              title: pr.title,
              body: pr.body,
              state: pr.state,
              url: pr.html_url,
              created_at: pr.created_at,
              user: pr.user?.login,
            }
          );
        }

        // PR merged event
        if (pr.merged_at) {
          const mergedAt = new Date(pr.merged_at);
          if (mergedAt >= since) {
            await createActivity(
              repo.id,
              'pr_merged',
              `pr_merged_${pr.id}`,
              pr.user?.login || 'unknown',
              mergedAt,
              {
                pr_number: pr.number,
                title: pr.title,
                body: pr.body,
                url: pr.html_url,
                merged_at: pr.merged_at,
              }
            );
          }
        }

        // PR closed (not merged) event
        if (pr.closed_at && !pr.merged_at) {
          const closedAt = new Date(pr.closed_at);
          if (closedAt >= since) {
            await createActivity(
              repo.id,
              'pr_closed',
              `pr_closed_${pr.id}`,
              pr.user?.login || 'unknown',
              closedAt,
              {
                pr_number: pr.number,
                title: pr.title,
                body: pr.body,
                url: pr.html_url,
                closed_at: pr.closed_at,
              }
            );
          }
        }
      }
    } catch (error: any) {
      if (error.status === 403 && error.message?.includes('organization has enabled OAuth App access restrictions')) {
        throw error; // Re-throw to be caught by parent handler
      }
      console.error(`Error ingesting pull requests for ${repo.full_name}:`, error.message || error);
    }
  }

  private async ingestPullRequestReviews(repo: Repository, since: Date) {
    try {
      const { data: prs } = await this.octokit.pulls.list({
        owner: repo.owner,
        repo: repo.name,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: 50,
      });

      for (const pr of prs) {
        const updatedAt = new Date(pr.updated_at);
        if (updatedAt < since) continue;

        try {
          const { data: reviews } = await this.octokit.pulls.listReviews({
            owner: repo.owner,
            repo: repo.name,
            pull_number: pr.number,
          });

          for (const review of reviews) {
            const submittedAt = review.submitted_at ? new Date(review.submitted_at) : null;
            if (submittedAt && submittedAt >= since) {
              await createActivity(
                repo.id,
                'pr_review',
                `review_${review.id}`,
                review.user?.login || 'unknown',
                submittedAt,
                {
                  pr_number: pr.number,
                  pr_title: pr.title,
                  review_id: review.id,
                  state: review.state,
                  body: review.body,
                  submitted_at: review.submitted_at,
                  user: review.user?.login,
                }
              );
            }
          }

          // Get PR comments (issue comments on PRs)
          const { data: comments } = await this.octokit.issues.listComments({
            owner: repo.owner,
            repo: repo.name,
            issue_number: pr.number,
            since: since.toISOString(),
          });

          for (const comment of comments) {
            const commentedAt = new Date(comment.created_at);
            if (commentedAt >= since) {
              await createActivity(
                repo.id,
                'pr_comment',
                `pr_comment_${comment.id}`,
                comment.user?.login || 'unknown',
                commentedAt,
                {
                  pr_number: pr.number,
                  pr_title: pr.title,
                  comment_id: comment.id,
                  body: comment.body,
                  url: comment.html_url,
                  user: comment.user?.login,
                }
              );
            }
          }
        } catch (error) {
          // Ignore errors for individual PRs
          console.error(`Error fetching reviews for PR #${pr.number}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error ingesting PR reviews for ${repo.full_name}:`, error);
    }
  }

  private async ingestIssues(repo: Repository, since: Date) {
    try {
      // Get closed issues
      const { data: closedIssues } = await this.octokit.issues.listForRepo({
        owner: repo.owner,
        repo: repo.name,
        state: 'closed',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
        since: since.toISOString(),
      });

      // Get open issues
      const { data: openIssues } = await this.octokit.issues.listForRepo({
        owner: repo.owner,
        repo: repo.name,
        state: 'open',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
        since: since.toISOString(),
      });

      const allIssues = [...closedIssues, ...openIssues].filter(issue => !issue.pull_request);
      console.log(`Found ${allIssues.length} issues`);

      for (const issue of allIssues) {
        const updatedAt = new Date(issue.updated_at);
        if (updatedAt < since) continue;

        // Issue opened event
        const createdAt = new Date(issue.created_at);
        if (createdAt >= since) {
          await createActivity(
            repo.id,
            'issue_opened',
            `issue_opened_${issue.id}`,
            issue.user?.login || 'unknown',
            createdAt,
            {
              issue_number: issue.number,
              title: issue.title,
              body: issue.body,
              state: issue.state,
              url: issue.html_url,
              created_at: issue.created_at,
              labels: issue.labels?.map((l: any) => (typeof l === 'string' ? l : l.name)),
              user: issue.user?.login,
            }
          );
        }

        // Issue closed event
        if (issue.closed_at) {
          const closedAt = new Date(issue.closed_at);
          if (closedAt >= since) {
            await createActivity(
              repo.id,
              'issue_closed',
              `issue_closed_${issue.id}`,
              issue.closed_by?.login || issue.user?.login || 'unknown',
              closedAt,
              {
                issue_number: issue.number,
                title: issue.title,
                body: issue.body,
                url: issue.html_url,
                closed_at: issue.closed_at,
                closed_by: issue.closed_by?.login,
              }
            );
          }
        }

        // Issue comments
        try {
          const { data: comments } = await this.octokit.issues.listComments({
            owner: repo.owner,
            repo: repo.name,
            issue_number: issue.number,
            since: since.toISOString(),
          });

          for (const comment of comments) {
            const commentedAt = new Date(comment.created_at);
            if (commentedAt >= since) {
              await createActivity(
                repo.id,
                'issue_comment',
                `issue_comment_${comment.id}`,
                comment.user?.login || 'unknown',
                commentedAt,
                {
                  issue_number: issue.number,
                  issue_title: issue.title,
                  comment_id: comment.id,
                  body: comment.body,
                  url: comment.html_url,
                  user: comment.user?.login,
                }
              );
            }
          }
        } catch (error) {
          // Ignore errors for individual issues
        }
      }
    } catch (error: any) {
      if (error.status === 403 && error.message?.includes('organization has enabled OAuth App access restrictions')) {
        throw error; // Re-throw to be caught by parent handler
      }
      console.error(`Error ingesting issues for ${repo.full_name}:`, error.message || error);
    }
  }

  private async ingestCIStatus(repo: Repository, since: Date) {
    try {
      const { data: commits } = await this.octokit.repos.listCommits({
        owner: repo.owner,
        repo: repo.name,
        since: since.toISOString(),
        per_page: 50,
      });

      for (const commit of commits) {
        try {
          const { data: checkRuns } = await this.octokit.checks.listForRef({
            owner: repo.owner,
            repo: repo.name,
            ref: commit.sha,
          });

          for (const check of checkRuns.check_runs) {
            if (check.completed_at) {
              const completedAt = new Date(check.completed_at);
              if (completedAt >= since) {
                const eventType: EventType =
                  check.conclusion === 'success' ? 'ci_success' : 'ci_failure';

                await createActivity(
                  repo.id,
                  eventType,
                  `check_${check.id}`,
                  commit.commit.author?.name || 'unknown',
                  completedAt,
                  {
                    check_name: check.name,
                    conclusion: check.conclusion,
                    status: check.status,
                    commit_sha: commit.sha,
                    url: check.html_url,
                    completed_at: check.completed_at,
                  }
                );
              }
            }
          }

          // Also check status API (for older CI systems)
          const { data: status } = await this.octokit.repos.getCombinedStatusForRef({
            owner: repo.owner,
            repo: repo.name,
            ref: commit.sha,
          });

          for (const statusCheck of status.statuses) {
            if (statusCheck.updated_at) {
              const updatedAt = new Date(statusCheck.updated_at);
              if (updatedAt >= since) {
                const eventType: EventType =
                  statusCheck.state === 'success' ? 'ci_success' : 'ci_failure';

                await createActivity(
                  repo.id,
                  eventType,
                  `status_${statusCheck.id}`,
                  commit.commit.author?.name || 'unknown',
                  updatedAt,
                  {
                    context: statusCheck.context,
                    state: statusCheck.state,
                    description: statusCheck.description,
                    commit_sha: commit.sha,
                    url: statusCheck.target_url,
                    updated_at: statusCheck.updated_at,
                  }
                );
              }
            }
          }
        } catch (error) {
          // Ignore errors for individual commits
          console.error(`Error fetching CI status for commit ${commit.sha}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error ingesting CI status for ${repo.full_name}:`, error);
    }
  }
}
