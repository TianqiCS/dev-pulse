import 'dotenv/config';
import { getSelectedRepositories, getRepositoryById } from '../models/repository';
import { aggregateActivityByPeriod } from '../services/aggregation';
import { SummaryService } from '../services/summary';
import { createOrUpdateSummary, getSummary } from '../models/summary';

interface GenerateSummaryOptions {
  userId: number;
  repoId?: number;
  daysBack?: number;
  force?: boolean;
}

async function generateSummary(options: GenerateSummaryOptions) {
  console.log('=== DevPulse Summary Generation ===');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    const { userId, repoId, daysBack = 7, force = false } = options;

    let repositories;

    if (repoId) {
      const repo = await getRepositoryById(repoId);
      if (!repo) {
        console.error(`Repository with ID ${repoId} not found`);
        process.exit(1);
      }
      repositories = [repo];
    } else {
      repositories = await getSelectedRepositories(userId);
    }

    if (repositories.length === 0) {
      console.log('No repositories to summarize. Please select repositories first.');
      process.exit(0);
    }

    console.log(`Generating summaries for ${repositories.length} repository(ies):\n`);
    repositories.forEach((repo, idx) => {
      console.log(`  ${idx + 1}. ${repo.full_name}`);
    });
    console.log('');

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - daysBack);

    const summaryService = new SummaryService();

    for (const repo of repositories) {
      console.log(`\n--- Processing: ${repo.full_name} ---`);

      // Check if summary already exists
      if (!force) {
        const existingSummary = await getSummary(repo.id, periodStart, periodEnd);
        if (existingSummary) {
          console.log('✓ Summary already exists (use --force to regenerate)');
          console.log(`Created: ${existingSummary.created_at}`);
          console.log(`\n${existingSummary.summary_text}\n`);
          continue;
        }
      }

      // Aggregate activity data
      console.log('Aggregating activity data...');
      const activityData = await aggregateActivityByPeriod(
        repo.id,
        repo.full_name,
        periodStart,
        periodEnd
      );

      console.log(`Found ${activityData.stats.totalActivities} activities`);

      if (activityData.stats.totalActivities === 0) {
        console.log('No activity found for this period. Skipping summary generation.');
        continue;
      }

      // Generate AI summary
      console.log('Generating AI summary...');
      const summaryText = await summaryService.generateSummary(activityData);

      // Store summary
      const summary = await createOrUpdateSummary(
        repo.id,
        periodStart,
        periodEnd,
        summaryText,
        summaryService.getModelVersion()
      );

      console.log('✓ Summary generated and stored successfully!');
      console.log(`Summary ID: ${summary.id}`);
      console.log(`\n${summaryText}\n`);
    }

    console.log('\n=== Summary Generation Complete ===');
    console.log(`Finished at: ${new Date().toISOString()}`);
    process.exit(0);
  } catch (error) {
    console.error('Summary generation failed:', error);
    process.exit(1);
  }
}

// Parse command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npm run summary <userId> [repoId] [--days=7] [--force]');
    console.error('');
    console.error('Examples:');
    console.error('  npm run summary 1              # Generate for all selected repos');
    console.error('  npm run summary 1 2            # Generate for repo ID 2');
    console.error('  npm run summary 1 --days=14    # Last 14 days');
    console.error('  npm run summary 1 --force      # Regenerate existing summary');
    process.exit(1);
  }

  const userId = parseInt(args[0], 10);
  let repoId: number | undefined;
  let daysBack = 7;
  let force = false;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--days=')) {
      daysBack = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--force') {
      force = true;
    } else {
      repoId = parseInt(arg, 10);
    }
  }

  if (isNaN(userId)) {
    console.error('Invalid user ID');
    process.exit(1);
  }

  generateSummary({ userId, repoId, daysBack, force });
}

export { generateSummary };
