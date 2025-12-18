import 'dotenv/config';
import { query } from '../src/db';
import { Octokit } from '@octokit/rest';

async function main() {
  const action = process.argv[2];
  const userId = parseInt(process.argv[3] || '1', 10);

  if (action === 'list') {
    // List all repositories
    const result = await query(
      'SELECT id, full_name, is_selected FROM repositories WHERE user_id = $1 ORDER BY is_selected DESC, full_name',
      [userId]
    );
    
    console.log('\n=== Repositories ===');
    console.log('ID\tSelected\tRepository');
    console.log('─'.repeat(50));
    result.rows.forEach((repo) => {
      console.log(`${repo.id}\t${repo.is_selected ? '✓' : ' '}\t\t${repo.full_name}`);
    });
    console.log(`\nTotal: ${result.rows.length} repositories`);
    console.log(`Selected: ${result.rows.filter((r) => r.is_selected).length} repositories`);
  } else if (action === 'sync') {
    // Sync repositories from GitHub
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.error('User not found');
      return;
    }

    const user = userResult.rows[0];
    const octokit = new Octokit({ auth: user.access_token });
    
    console.log('\nFetching repositories from GitHub...');
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
    });

    console.log(`Found ${repos.length} repositories`);

    for (const repo of repos) {
      await query(
        `INSERT INTO repositories (user_id, github_id, name, full_name, owner, is_selected)
         VALUES ($1, $2, $3, $4, $5, false)
         ON CONFLICT (user_id, github_id) 
         DO UPDATE SET name = $3, full_name = $4, owner = $5`,
        [userId, repo.id.toString(), repo.name, repo.full_name, repo.owner.login]
      );
    }

    console.log('✓ Repositories synced successfully');
    console.log('\nRun: npm run repos list 1');
  } else if (action === 'select') {
    // Select repositories
    const repoIds = process.argv.slice(3).map(Number);
    
    if (repoIds.length === 0) {
      console.error('Usage: npm run repos select <repo_id1> <repo_id2> ...');
      return;
    }

    if (repoIds.length > 3) {
      console.error('Maximum 3 repositories can be selected');
      return;
    }

    // Deselect all first
    await query('UPDATE repositories SET is_selected = false WHERE user_id = $1', [userId]);

    // Select specified repos
    await query(
      'UPDATE repositories SET is_selected = true WHERE user_id = $1 AND id = ANY($2)',
      [userId, repoIds]
    );

    console.log(`✓ Selected ${repoIds.length} repository(ies)`);
    console.log('\nRefresh your browser to see changes');
  } else {
    console.log(`
DevPulse Repository Manager

Usage:
  npm run repos list [userId]      - List all repositories
  npm run repos sync [userId]      - Sync repositories from GitHub
  npm run repos select <ids...>    - Select repositories (max 3)

Examples:
  npm run repos list 1
  npm run repos sync 1
  npm run repos select 1 2 3
    `);
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
