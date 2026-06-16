# COMPETE

COMPETE is a combat-sports operations platform for promoters, gyms, coaches,
fighters, officials, and parents. It manages event invitations, rosters,
matchmaking, fight cards, weigh-ins, waivers, records, scorecards, and media.

## Stack

- TanStack Start, React 19, Vite 7, and Tailwind CSS 4
- Netlify Functions for every API endpoint
- SQL Server / Azure SQL using SQL authentication
- SQL `VARBINARY(MAX)` document storage
- One-time-password authentication with signed sessions
- Seq structured logging (local Docker setup included)
- Node contract tests and a complete Postman collection

## Quick Start

1. Copy `.env.example` to `.env` and update the SQL credentials.
2. Start Seq with `docker compose up -d`.
3. Create the local database:

   ```powershell
   .\database\setup-local.ps1
   ```

4. Install and run:

   ```powershell
   npm install
   npm run dev
   ```

`npm run dev` serves the Netlify-enabled Vite app at `http://localhost:3000`.
`npm run netlify:dev` uses the Netlify CLI entry point at `http://localhost:8888`.

Use `AUTH_EXPOSE_OTP=true` locally to return the OTP in the API response. Never
enable that setting in a deployed environment.

## Commands

```powershell
npm run dev
npm run build
npm run typecheck
npm test
```

See [docs/local-development.md](docs/local-development.md) for VS Code,
SQL Express, Seq, and Postman details.
