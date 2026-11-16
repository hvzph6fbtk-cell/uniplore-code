# User Instruction Memory

This file records user instructions, preferences, and teachings for reference in future interactions.

## Format

### User Instruction Entry
[User Instruction Summary]
- Date: [YYYY-MM-DD]
- Context: [Mentioned scenario or time]
- Instructions:
  - [Content of user teaching or instruction, described line by line]

### Project Knowledge Entry
[Project Knowledge Summary]
- Date: [YYYY-MM-DD]
- Context: Discovered by Agent while performing [specific task description]
- Category: [Operations & Deployment|Build Methods|Testing Methods|Troubleshooting & Debugging|Workflow & Collaboration|Environment Configuration]
- Instructions:
  - [Specific knowledge points, described line by line]

## Deduplication Strategy
- Before adding a new entry, check for similar or identical instructions.
- If a duplicate is found, skip the new entry or merge it with the existing one.
- When merging, update the context or date information.
- This helps avoid redundant entries and keeps the memory file tidy.

## Entries

[Project Knowledge Summary]
- Date: 2026-11-16
- Context: Discovered by Agent while building the snake game
- Category: Build Methods
- Instructions:
  - The project is a pure static site (index.html + style.css + game.js), with no build step and no package manager toolchain.
  - Syntax check: `node --check game.js`.
  - Gameplay logic is tested headlessly by stubbing DOM/canvas in Node; test scripts live in /tmp/opencode and are not part of the repo.

[Project Knowledge Summary]
- Date: 2026-11-16
- Context: Discovered by Agent while previewing the snake game
- Category: Operations & Deployment
- Instructions:
  - Preview the site with `python3 -m http.server 8080 --bind 0.0.0.0` from the repository root.
  - Use background terminal tooling for the server and stop it by terminal ID.