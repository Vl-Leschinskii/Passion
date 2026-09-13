# Passion — anonymous hero quiz

Anonymous survey based on the Gumilev + Big Five literary hero test. New visitors get the quiz; returning visitors (cookie) see an “already answered” screen with an optional email form. Books can be extended by dropping new texts into a Google Drive folder.

## Stack

- Next.js (App Router) + TypeScript
- Postgres + Prisma
- Optional: Google Drive sync + OpenAI-compatible LLM for new books

## Quick start

```bash
# Node 20+
export PATH="$HOME/.local/node/bin:$PATH"

cd passion
cp .env.example .env   # already present if cloned with defaults

docker compose up -d
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3010/passion](http://localhost:3010/passion) (direct) or via gateway [http://localhost/passion](http://localhost/passion).

**Production URL on this server:** [http://217.160.139.56/passion](http://217.160.139.56/passion)

### Admin stats (`/passion/admin`)

Allowlisted email (default `vleschinskii@gmail.com`) + `ADMIN_TOKEN` from `.env`.

- UI: [/passion/admin/](https://217.160.139.56/passion/admin/)
- CSV export: `/passion/api/admin/export` (after login)
- Configure emails: `ADMIN_EMAILS=a@x.com,b@y.com`

Default DB URL: `postgresql://passion:passion@localhost:5433/passion`

### Production gateway (`/passion` on port 80)

```bash
docker compose up -d          # db + nginx gateway on :80
npm run build && npm run start  # Next on :3010 with basePath=/passion
```

Nginx proxies:
- `/passion` → Next.js `:3010`
- `/` → existing site on `:3001`


## Behaviour

1. First visit sets httpOnly cookie `passion_rid` (UUID) and creates a `Respondent`.
2. Quiz UI mirrors the original HTML prototype (3 seeded books).
3. Progress is cached in `localStorage`; **each completed hero is saved to Postgres immediately** (`HeroAnswer`).
4. When all published heroes are answered, the survey is marked completed automatically (no final “submit everything” button).
5. Later visits with the same cookie show “You already answered” + optional email (`Interest`) only after completion; unfinished progress resumes.
6. Language switch: **RU / EN** (UI + titles/names).

## Google Drive monitoring

Folder: [книги](https://drive.google.com/drive/folders/1TGz0X3YM1D15mATN1Iwh-BywJA4WVYWj)

1. Create a Google Cloud **service account**.
2. Share the Drive folder with that SA email (Viewer).
3. Put credentials in `.env`:

```env
GOOGLE_DRIVE_FOLDER_ID=1TGz0X3YM1D15mATN1Iwh-BywJA4WVYWj
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

Sync endpoints:

```bash
# cron / scheduler
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3010/api/cron/sync-drive

# manual admin
curl -X POST -H "x-admin-token: $ADMIN_TOKEN" http://localhost:3010/api/admin/sync-drive

# CLI
npm run sync:drive
```

Known seed books (Mitchell / Scott / Tolstoy) are **skipped** (already seeded). Any **new** `.doc` / `.docx` / `.pdf` is downloaded, text-extracted, analysed by the LLM into Gumilev type + BFI scores (−1…+1), and published for new respondents.

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run db:seed` | Seed 3 books from the HTML prototype |
| `npm run sync:drive` | One-shot Drive sync |
| `npx prisma studio` | Browse DB |

## Security notes

- Change `CRON_SECRET` and `ADMIN_TOKEN` before any public deploy.
- Responses are anonymous; email is stored only if the user opts in after completion.
