import { execSync } from 'node:child_process';

// Get current branch name
const branchName = execSync('git rev-parse --abbrev-ref HEAD')
  .toString()
  .trim();

// Ignore main branches
if (['develop', 'main', 'master'].includes(branchName)) {
  process.exit(0);
}

// Regex to validate branch name format: type/123-task-description
const branchRE =
  /^(feat|fix|chore|docs|style|refactor|perf|test)\/\d+-[a-z0-9-]+$/;

if (!branchRE.test(branchName)) {
  console.error(`\n❌ Error: Invalid branch name: "${branchName}"`);
  console.error(`👉 Expected format: type/123-task-description`);
  console.error(`💡 Examples:`);
  console.error(`   feat/123-setup-eslint`);
  console.error(`   fix/456-button-bug\n`);
  process.exit(1); // Block commit if branch name is invalid
}
