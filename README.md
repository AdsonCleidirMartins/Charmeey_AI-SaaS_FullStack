# CharmeeyAI — AI-Powered SaaS Platform

Modern, production-grade AI-powered SaaS platform combining a **React / Vite frontend**, **Prisma ORM**, **Gemini AI SDK**, and a **FastAPI Python AI microservice**.

---

## Architecture

```tree
├── apps/
│   └── web/                 # React + TypeScript Vite frontend
├── packages/
│   ├── ai-sdk/              # Gemini LLM SDK types & shared helpers
│   └── database/            # Prisma ORM schema & database client
└── services/
    └── ai/                  # FastAPI Python microservice (Auth, Gemini chat, embeddings)
```

## Quick Start

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- Docker & Docker Compose (optional, for local PostgreSQL/Redis/MinIO)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run with Docker (Recommended)
```bash
# Start infrastructure (PostgreSQL, Redis, MinIO)
npm run docker:up

# Start frontend development server
npm run dev:web
```
Open [http://localhost:5173](http://localhost:5173).

### 3. Run Locally (Without Docker)
- **Database & Python Service:**
  Ensure PostgreSQL is running and `.env` has your `DATABASE_URL`.
  ```bash
  npx prisma generate --schema=packages/database/prisma/schema.prisma
  
  cd services/ai
  pip install -r requirements.txt
  uvicorn app.main:app --reload --port 8000
  ```
- **Frontend:**
  ```bash
  npm run dev:web
  ```

---

## Workspace Scripts

- `npm run dev:web` — Start frontend dev server
- `npm run build:web` — Build frontend for production
- `npm run lint:web` — Run ESLint
- `npm run typecheck:web` — Run TypeScript type checking
- `npm run docker:up` / `docker:down` — Manage Docker infrastructure

---

## License
MIT
