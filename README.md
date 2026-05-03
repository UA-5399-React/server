# TechnoWorld API

> E-commerce CRM systhem powered by NestJS and React

[![CI](https://github.com/UA-5399-React/server/actions/workflows/ci.yml/badge.svg)](https://github.com/UA-5399-React/server/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-%3E80%25-brightgreen)](https://github.com/UA-5399-React/server/actions/workflows/ci.yml)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running the Database](#running-the-database)
- [Migrations & Seeding](#migrations--seeding)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Code Style & Conventions](#code-style--conventions)

---

## Prerequisites

Make sure the following are installed on your machine before proceeding:

| Tool        | Version   | Install                                        |
| ----------- | --------- | ---------------------------------------------- |
| **Node.js** | `>= 24.x` | https://nodejs.org                             |
| **pnpm**    | `>= 9.x`  | `npm install -g pnpm`                          |
| **MongoDB** | `>= 7.x`  | https://www.mongodb.com/try/download/community |

> Access to a **MongoDB Atlas** cluster is optional but recommended for staging-like local development. Ask a teammate for credentials or check the shared secrets storage.

---

## Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:UA-5399-React/server.git
cd server
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

**Linux / macOS:**

```bash
cp .env.example .env
```

**Windows (CMD):**

```cmd
copy .env.example .env
```

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
```

### 4. Start the development server

```bash
pnpm start:dev
```

The server will start with hot-reload enabled at `http://localhost:<PORT>`.

### 5. Start in production mode

```bash
pnpm start
```

---

## Running the Database

### Option A — MongoDB Atlas (recommended)

1. Get access to the Atlas cluster from a teammate.
2. Copy the connection string into your `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```
3. No additional local setup required — the app connects automatically on start.

### Option B — Local MongoDB

**Using Docker (not available yet):**

```bash
docker run -d \
  --name mongo-local \
  -p 27017:27017 \
  mongo:7
```

**Using a local installation:**

```bash
# macOS
brew services start mongodb-community

# Ubuntu / Debian
sudo systemctl start mongod

# Windows — start via Services or:
net start MongoDB
```

Then set in `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/<dbname>
```

---

## Migrations & Seeding

### Run migrations

```bash
pnpm migrate
```

Applies all pending database migrations in order.

### Seed the database

```bash
pnpm seed
```

Populates the database with initial / development data.

> ⚠️ Do not run `seed` against a production or shared staging database.

---

## Available Scripts

| Command          | Description                            |
| ---------------- | -------------------------------------- |
| `pnpm start`     | Start in production mode               |
| `pnpm start:dev` | Start with hot-reload (development)    |
| `pnpm build`     | Compile TypeScript to `dist/`          |
| `pnpm migrate`   | Run database migrations                |
| `pnpm seed`      | Seed the database with initial data    |
| `pnpm test`      | Run unit tests                         |
| `pnpm test:e2e`  | Run end-to-end tests                   |
| `pnpm test:cov`  | Run tests and generate coverage report |
| `pnpm lint`      | Run ESLint across the codebase         |
| `pnpm lint:fix`  | Run ESLint and auto-fix issues         |

---

## API Documentation

### REST — Swagger UI

Available at:

```
http://localhost:<PORT>/api
```

Swagger is only enabled in `development` mode. The UI provides an interactive interface to explore and test all REST endpoints.

### GraphQL — Playground / Sandbox

Available at:

```
http://localhost:<PORT>/graphql
```

Use the built-in sandbox to explore the schema, run queries, and test mutations interactively.

---

## Testing

### Run all unit tests

```bash
pnpm test
```

### Run tests in watch mode

```bash
pnpm test --watch
```

### Run tests with coverage

```bash
pnpm test:cov
```

### Run end-to-end tests

```bash
pnpm test:e2e
```

> Make sure the database is running and `.env` is configured before running e2e tests.

---

## Code Style & Conventions

The project uses **ESLint** with **TypeScript**, **Prettier**, and **simple-import-sort** to enforce consistent code style.

### Running the linter

```bash
pnpm lint         # check for issues
pnpm lint:fix     # auto-fix where possible
```

### Import order

Imports are automatically sorted into the following groups (enforced by `simple-import-sort`):

1. **Side-effects** — e.g. `import 'reflect-metadata'`
2. **Node.js built-ins** — e.g. `node:fs`, `node:path`
3. **External packages** — e.g. `@nestjs/*`, `rxjs`
4. **Internal aliases** — paths starting with `@/`
5. **Relative imports** — `../` before `./`

### Key rules

| Rule                                      | Setting | Notes                                     |
| ----------------------------------------- | ------- | ----------------------------------------- |
| `eqeqeq`                                  | `error` | Always use `===` instead of `==`          |
| `@typescript-eslint/no-explicit-any`      | `off`   | Allowed, but avoid when possible          |
| `@typescript-eslint/no-floating-promises` | `warn`  | Always `await` or `.catch()` promises     |
| `prettier/prettier`                       | `error` | Auto-formatting is enforced               |
| `simple-import-sort/imports`              | `error` | Imports must follow the group order above |

### Prettier

End-of-line is set to `auto` to support both Unix and Windows environments. Formatting is applied on save (if your editor supports it) or enforced by the linter.

### Editor setup (recommended)

Install the following VS Code extensions for the best experience:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier – Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  Add to your `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```
