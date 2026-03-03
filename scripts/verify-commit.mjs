import fs from 'node:fs';

// Git provides the commit message file path as the first argument
const msgPath = process.argv[2];
const msg = fs.readFileSync(msgPath, 'utf-8').trim();

// Ignore merge commits
if (msg.startsWith('Merge branch')) {
  process.exit(0);
}

// Regex to validate commit message format: type(123): description (e.g., feat(123): add eslint)
const commitRE = /^(feat|fix|chore|docs|style|refactor|perf|test)\(\d+\):\s.+/;

if (!commitRE.test(msg)) {
  console.error(`\n❌ Error: Invalid commit message format.`);
  console.error(`Commit message: "${msg}"`);
  console.error(`👉 Expected format: type(123): your task in a nutshell`);
  console.error(`💡 Examples:`);
  console.error(`   feat(123): setup eslint and prettier`);
  console.error(`   fix(456): resolve button color issue\n`);
  process.exit(1); // Block commit if message is invalid
}
