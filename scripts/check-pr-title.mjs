const title = process.argv.slice(2).join(" ").trim() || process.env.PR_TITLE?.trim();

const allowedTypes = [
  "feat",
  "fix",
  "docs",
  "chore",
  "refactor",
  "test",
  "build",
  "ci",
  "perf",
  "style",
  "revert",
];

const typePattern = allowedTypes.join("|");
const titlePattern = new RegExp(
  `^(?:${typePattern})\\([a-z0-9][a-z0-9._/-]*\\)!?: [a-z0-9].+$`,
);

if (!title) {
  console.error("Missing PR title. Pass it as an argument or set PR_TITLE.");
  process.exit(1);
}

if (!titlePattern.test(title)) {
  console.error(`Invalid PR title: ${title}`);
  console.error("Expected: type(scope): subject");
  console.error("Example: fix(release): publish Windows assets at release root");
  console.error(`Allowed types: ${allowedTypes.join(", ")}`);
  console.error("Use a lowercase scope and begin the subject with a lowercase letter or digit.");
  console.error("Do not add a PR number; GitHub adds it after squash merge.");
  process.exit(1);
}

console.log(`Valid PR title: ${title}`);
