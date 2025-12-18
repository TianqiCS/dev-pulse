import 'dotenv/config';
import { getUserById } from '../models/user';
import { getSelectedRepositories } from '../models/repository';
import { GitHubService } from '../services/github';

async function runIngestion(userId?: number) {
  console.log('=== DevPulse Activity Ingestion Job ===');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    // If no userId provided, get it from command line args
    const targetUserId = userId || parseInt(process.argv[2], 10);

    if (!targetUserId || isNaN(targetUserId)) {
      console.error('Usage: npm run ingest <userId>');
      console.error('Example: npm run ingest 1');
      process.exit(1);
    }

    const user = await getUserById(targetUserId);
    if (!user) {
      console.error(`User with ID ${targetUserId} not found`);
      process.exit(1);
    }

    console.log(`Running ingestion for user: ${user.username} (ID: ${user.id})`);

    const selectedRepos = await getSelectedRepositories(user.id);
    if (selectedRepos.length === 0) {
      console.log('No repositories selected. Please select repositories first.');
      process.exit(0);
    }

    console.log(`Found ${selectedRepos.length} selected repositories:\n`);
    selectedRepos.forEach((repo, idx) => {
      console.log(`  ${idx + 1}. ${repo.full_name}`);
    });
    console.log('');

    const githubService = new GitHubService(user.access_token);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const repo of selectedRepos) {
      console.log(`\n--- Processing: ${repo.full_name} ---`);
      try {
        await githubService.ingestRepositoryActivity(repo, 7);
        successCount++;
      } catch (error: any) {
        if (error.status === 403 && error.message?.includes('organization has enabled OAuth App access restrictions')) {
          skippedCount++;
        } else {
          errorCount++;
        }
      }
    }

    console.log('\n=== Ingestion Complete ===');
    console.log(`Finished at: ${new Date().toISOString()}`);
    console.log(`\nResults:`);
    console.log(`  ✓ Success: ${successCount}`);
    if (skippedCount > 0) {
      console.log(`  ⚠️  Skipped: ${skippedCount} (OAuth restrictions)`);
    }
    if (errorCount > 0) {
      console.log(`  ✗ Failed: ${errorCount}`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runIngestion();
}

export { runIngestion };
