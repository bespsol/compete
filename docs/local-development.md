# Local Development

## Prerequisites

- Node.js 22 or later
- SQL Server Express with SQL authentication enabled
- `sqlcmd` on `PATH`
- Docker Desktop
- VS Code

## 1. Configure SQL Express

The application uses SQL authentication locally and in Azure SQL. Enable mixed
mode authentication in SQL Server, create a login, and set the values in `.env`.

Typical local values:

```dotenv
SQL_SERVER=localhost
SQL_PORT=1433
SQL_DATABASE=Compete
SQL_USER=sa
SQL_PASSWORD=YourStrong!Passw0rd
SQL_ENCRYPT=false
SQL_TRUST_SERVER_CERTIFICATE=true
```

Run the schema and demo seed:

```powershell
.\database\setup-local.ps1 -ServerInstance ".\SQLEXPRESS"
```

To create the schema without demo records:

```powershell
.\database\setup-local.ps1 -ServerInstance ".\SQLEXPRESS" -SkipSeed
```

## 2. Start Seq

```powershell
docker compose up -d
```

Seq is available at [http://localhost:5341](http://localhost:5341). The local
container intentionally starts without authentication; do not use that setting
for a shared or production Seq instance.

## 3. Configure the application

```powershell
Copy-Item .env.example .env
```

Set a minimum 32-character `JWT_SECRET` and a separate `OTP_PEPPER`.
`AUTH_EXPOSE_OTP=true` includes the code in local API responses and Seq events.
Set it to `false` in Netlify.

For deployed OTP delivery, set `OTP_DELIVERY_WEBHOOK_URL`. COMPETE posts the
destination, six-digit code, purpose, and expiry to that endpoint. Set
`OTP_DELIVERY_WEBHOOK_API_KEY` when the endpoint accepts a bearer token.

## 4. Run and debug

Install dependencies, then run Netlify Dev so `/api/*` is routed to the
function:

```powershell
npm install
npm run netlify:dev
```

Open [http://localhost:8888](http://localhost:8888).

The VS Code task **Start Seq** starts logging, and the launch compound
**COMPETE: Full Stack** starts the local site. Breakpoints can be placed in
`netlify/functions/api.ts` and `src/server/*`.

## 5. Postman

Import:

- `postman/COMPETE.postman_collection.json`
- `postman/COMPETE.local.postman_environment.json`

Run **Authentication / Request OTP**, copy the local `code` into the environment,
then run **Verify OTP**. Its test script stores the bearer token automatically.

## Production

Set the same variables in Netlify, changing:

- `SQL_ENCRYPT=true`
- `SQL_TRUST_SERVER_CERTIFICATE=false`
- `AUTH_EXPOSE_OTP=false`
- `OTP_DELIVERY_WEBHOOK_URL` to an email or SMS delivery endpoint
- `APP_ORIGIN` to the deployed site URL
- `SEQ_URL` and `SEQ_API_KEY` to the hosted Seq ingestion endpoint

The SQL login should have only the permissions required on the `compete` schema.
