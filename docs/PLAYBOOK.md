
# Playbook references

This project follows the canonical engineering playbook:

- **Handbook:** https://raw.githubusercontent.com/toniomon96/engineering-playbook/main/HANDBOOK.md
- **Design workflow:** https://raw.githubusercontent.com/toniomon96/engineering-playbook/main/DESIGN_WORKFLOW.md
- **Architecture prompt:** https://raw.githubusercontent.com/toniomon96/engineering-playbook/main/ARCHITECTURE_PROMPT.md
- **Current practice roadmap:** `diagnose-to-plan/docs/PRACTICE_PRODUCTION_ROADMAP.md`

When starting a new Claude or Copilot session in this repo, share the relevant raw URL(s) alongside this project's `ARCHITECTURE.md` for full context.

Handoff bundles from Claude Design live in `design/<surface>/`. Implementation PRs reference the bundle commit they were built from.

## FamilyTrips privacy gate

This repo is a static client-side family planning app. Anything in `src/data/trips` is shipped in the built JavaScript bundle. `visibility: 'unlisted'` only hides a trip from the rendered index; it is not authentication.

Before adding AI, public sharing, or sensitive trip details, run a privacy-first review and keep private information out of static trip objects unless the family explicitly accepts that exposure.

## Local verification

Run these before sharing or merging behavior/content changes:

```powershell
npm run validate:data
npm run lint
npm run test
npm run build
```
