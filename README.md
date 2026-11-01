# JobPilot

A **standalone mobile-first UK job search and application workspace**, built from the original `Empyrios/autoapply` starter repository.

## MVP features

- Save and edit job vacancies, with employers, salary ranges (GBP), location, type, work mode, deadlines and original links.
- Manage a six-stage application pipeline: Saved, Applied, Interviewing, Offer, Rejected, Withdrawn.
- Transparent deterministic *fit scores* against an editable salary floor, skills, locations and work preferences. The percentage describes observed alignment; the **data coverage** percentage indicates how much information was available. Not predictive AI.
- Add interview dates, notes and next-action reminders per application.
- Search and filter the job board, export CSV or complete JSON backup and restore on another browser.
- Installable, offline-capable dark-mode PWA. No backend, trackers or required API keys.
- Optional demo mode uses fictional vacancies and never uploads anything.

## Start locally

```bash
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000`. Test with `npm run verify` using Node 22+.

## GitHub Pages

This project currently lives in the existing `Empyrios/autoapply` repository. To publish, set `Settings > Pages > Source: GitHub Actions`. With the present repository name, the public URL is expected to be `https://empyrios.github.io/autoapply/`. For the preferred product URL `/jobpilot/`, rename the repository in GitHub Settings, or create and transfer to a dedicated `jobpilot` repository.

## Boundaries

**No automated applications or scraping are implemented.** Automated submissions can create account blocks, low-quality applications and legal/terms risks. Build assisted drafting and permitted integrations as separate, user-reviewed features later.

**Privacy:** This MVP uses unencrypted browser localStorage. Do not enter passwords, NI numbers, personal identifiers or confidential documents; export backups only to private storage. Public source code contains no real user records. A new browser profile or custom domain will not automatically access the existing local data.
