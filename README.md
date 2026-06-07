# Form Strat — Backend API

Express + PostgreSQL REST API for the Form Strat capstone project. Uses the
`pg` driver with raw, parameterized SQL (no ORM).

## Tech stack

- **Express 4** — HTTP server & routing
- **pg** — PostgreSQL client (connection pool + parameterized queries)
- **dotenv** — environment config
- **cors**, **morgan** — CORS + request logging
- ES modules (`"type": "module"`)

## Project structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.js          # Validated environment config
│   │   └── db.js           # pg connection pool + query() helper
│   ├── controllers/
│   │   └── form.controller.js
│   ├── db/
│   │   ├── schema.sql      # Table definitions
│   │   ├── migrate.js      # Applies schema.sql
│   │   └── seed.js         # Sample data
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   ├── routes/
│   │   ├── index.js        # Mounts /api/* routers
│   │   └── form.routes.js
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

Responses are JSON: success payloads are wrapped in `{ "data": ... }`,
errors in `{ "error": { "message": ... } }`.

### Example

```bash
curl -X POST http://localhost:4000/api/forms \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Signup",
    "fields": [{ "type": "email", "label": "Email", "required": true }]
  }'
```

## NPM scripts

| Script               | What it does                     |
| -------------------- | -------------------------------- |
| `npm run dev`        | Start with nodemon (auto-reload) |
| `npm start`          | Start in production mode         |
| `npm run db:migrate` | Create tables from schema.sql    |
| `npm run db:seed`    | Seed sample data                 |
