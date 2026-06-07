# Form Strat — Backend API

Express + PostgreSQL REST API for the **Form Strat** AI form builder. Uses the
`pg` driver with raw, parameterized SQL (no ORM), and Claude (via the official
Anthropic SDK) for AI form generation, field suggestions, and analytics.

## Tech stack

- **Express 4** — HTTP server & routing
- **pg** — PostgreSQL client (connection pool + parameterized queries)
- **@anthropic-ai/sdk** + **Zod** — Claude with structured outputs (guaranteed-valid JSON)
- **dotenv** — environment config
- **cors**, **morgan** — CORS + request logging
- ES modules (`"type": "module"`)

## Project structure

```
form-strat-backend/
├── src/
│   ├── config/
│   │   ├── env.js          # Validated environment config
│   │   ├── db.js           # pg connection pool + query() helper
│   │   └── anthropic.js    # Lazy Anthropic client (503 if no API key)
│   ├── ai/
│   │   └── schemas.js      # Zod schemas for AI structured outputs
│   ├── controllers/
│   │   ├── form.controller.js
│   │   ├── ai.controller.js        # generate-form, suggest-fields
│   │   └── analytics.controller.js # stats + AI narrative
│   ├── services/
│   │   └── analytics.service.js     # pure raw-stats aggregation
│   ├── db/
│   │   ├── schema.sql      # Table definitions
│   │   ├── migrate.js      # Applies schema.sql
│   │   └── seed.js         # Sample data
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   ├── routes/
│   │   ├── index.js        # Mounts /api/* routers
│   │   ├── form.routes.js  # /forms + /forms/:id/analytics
│   │   └── ai.routes.js    # /ai/*
│   ├── utils/
│   │   ├── ApiError.js
│   │   └── asyncHandler.js
│   ├── app.js              # Express app + middleware wiring
│   └── server.js           # Entry point (starts the server)
├── .env.example
└── package.json
```

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL
   instance.

   ```bash
   cp .env.example .env
   ```

3. **Create the tables**

   ```bash
   npm run db:migrate        # applies src/db/schema.sql
   npm run db:seed           # (optional) insert sample data
   ```

4. **Run the server**

   ```bash
   npm run dev               # http://localhost:4000 (auto-reload)
   # or
   npm start
   ```

   Check it's up: `GET http://localhost:4000/health`

## API reference

Base URL: `http://localhost:4000/api`

| Method | Endpoint                  | Description                 |
| ------ | ------------------------- | --------------------------- |
| GET    | `/forms`                  | List all forms              |
| POST   | `/forms`                  | Create a form               |
| GET    | `/forms/:id`              | Get a single form           |
| PATCH  | `/forms/:id`              | Update a form               |
| DELETE | `/forms/:id`              | Delete a form               |
| GET    | `/forms/:id/submissions`  | List a form's submissions   |
| POST   | `/forms/:id/submissions`  | Submit a response to a form |
| GET    | `/forms/:id/analytics`    | Per-field stats + AI insights for a form |

### AI endpoints

These require `ANTHROPIC_API_KEY` to be set (otherwise they return `503`). They
use Claude with **structured outputs**, so responses are always valid JSON
matching the form-field schema.

| Method | Endpoint              | Description                                          |
| ------ | --------------------- | --------------------------------------------------- |
| POST   | `/ai/generate-form`   | Generate a full form schema from a text prompt      |
| POST   | `/ai/suggest-fields`  | Suggest extra/improved fields for a form draft      |

Responses are JSON: success payloads are wrapped in `{ "data": ... }`,
errors in `{ "error": { "message": ... } }`.

### Examples

```bash
# Create a form manually
curl -X POST http://localhost:4000/api/forms \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Signup",
    "fields": [{ "type": "email", "label": "Email", "name": "email", "required": true }]
  }'

# Generate a form with AI
curl -X POST http://localhost:4000/api/ai/generate-form \
  -H "Content-Type: application/json" \
  -d '{ "prompt": "a job application form for a software engineer role" }'

# Analytics for a form (raw stats + AI narrative; ?ai=false skips the narrative)
curl http://localhost:4000/api/forms/<FORM_ID>/analytics
```

The analytics response shape:

```jsonc
{
  "data": {
    "formId": "...",
    "title": "...",
    "stats": {
      "totalSubmissions": 42,
      "perField": [ /* answered counts, distributions, numeric summaries, samples */ ],
      "responsesOverTime": [ { "date": "2026-06-07", "count": 5 } ]
    },
    "insights": {          // null when AI isn't configured or there are no responses
      "summary": "...",
      "keyFindings": ["..."],
      "recommendations": ["..."]
    },
    "aiConfigured": true
  }
}
```

## NPM scripts

| Script               | What it does                     |
| -------------------- | -------------------------------- |
| `npm run dev`        | Start with nodemon (auto-reload) |
| `npm start`          | Start in production mode         |
| `npm run db:migrate` | Create tables from schema.sql    |
| `npm run db:seed`    | Seed sample data                 |
