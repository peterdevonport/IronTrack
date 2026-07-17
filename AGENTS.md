# OpenCode System Instructions & Guardrails

## 1. Critical Git Workflow
- **ALWAYS** run `git checkout master && git pull origin master` before starting any new task.
- **ALWAYS** create a new feature or bugfix branch from `master` for all work.
- **NEVER** commit, modify, or push code directly to the `master` branch.
- **Branch Naming Convention:** Use `feature/short-description` or `bugfix/short-description`.
- **Pull Requests:** Push the completed branch to the remote repository. Do not attempt to merge into `master` via CLI.

## 2. Development & Coding Standards
- **Write Clean Code:** Prioritize readability, modularity, and adherence to established project patterns.
- **Do Not Guess:** If a dependency, API, or architectural pattern is ambiguous, stop and ask the user for clarification.
- **No Ghost Code:** Delete or refactor unused variables, dead code, and temporary logging statements before finalizing a task.
- **Comments & Docs:** Add meaningful inline comments for complex logic, and update relevant documentation (`README.md`, etc.) if system behavior changes.

## 3. Commit Message Guidelines
- **ALWAYS** use Conventional Commits formatting for all commit messages. 
- **Format:** `<type>(<scope>): <short description in imperative mood>`
  - *Examples:* `feat(auth): add JWT validation middleware`, `fix(api): resolve null pointer in user payload`
- **Allowed Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

## 4. Execution & Safety Guardrails
- **NEVER** run destructive commands (e.g., `rm -rf`, `git reset --hard`) without explicit, sequential confirmation from the user.
- **Incremental Progress:** Break large tasks into smaller, logical steps. Verify each step before moving to the next.

## 5. Dependency Management
- **Pin exact versions** in `package.json` (no `^` carets) for direct devDependencies to prevent lockfile drift.
- After any `npm install <pkg>` or `npm install --save-dev <pkg>`, always run `npm ci` locally to verify the lockfile is consistent before pushing.
- If `npm ci` fails with `Invalid: lock file's <pkg> does not satisfy <pkg>`, run `npm install` (no args) to sync the lockfile, then commit the updated `package-lock.json`.

## 6. Graphify Knowledge Graph

This project uses Graphify (https://graphify.net/) to map the codebase as a queryable knowledge graph.

- **Location:** `graphify-out/` in the project root
- **Query first:** Before grepping or reading files for architecture questions, run `graphify query "<question>"` to get a scoped subgraph
- **Path tracing:** Use `graphify path "<node1>" "<node2>"` to find how two things connect
- **Explain nodes:** Use `graphify explain "<node>"` for everything Graphify knows about a symbol
- **Refresh:** After structural changes, run `graphify . --code-only --update` (no API cost)
- **The graph is committed:** `graphify-out/` is in git so everyone starts with a map
- **Commit hook installed:** Auto-rebuilds on `git commit` (AST-only, no API cost)

## 7. Verification Checklist (Definition of Done)
Before declaring a task finished, you must successfully execute:
1. Run `git status` to ensure no untracked, accidental, or sensitive files (like `.env`) are being staged.
2. Stage and commit the changes locally using the prescribed Conventional Commit format.
3. Push the feature/bugfix branch to the GitHub remote repository to trigger the GitHub workflows.
4. Output a summary of the changes made and provide the exact branch name so the user can open a Pull Request.
