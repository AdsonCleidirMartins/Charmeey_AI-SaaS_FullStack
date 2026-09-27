# CharmeeyAI — AI-Powered SaaS Platform

Modern, production-grade AI-powered SaaS platform combining a **React / Vite frontend**, **Prisma ORM**, **Gemini AI SDK**, and a **FastAPI Python AI microservice**.

---

![First UI](assets/img/firstpage.gif)

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

## GitHub Guide & Contribution

1. **Clone the repository:**

   ```bash
   git clone https://github.com/charmeey/Charmeey_AI-SaaS_FullStack.git
   cd Charmeey_AI-SaaS_FullStack
   ```

2. **Create a feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Commit your changes:**

   ```bash
   git add .
   git commit -m "feat: description of your feature"
   ```

4. **Push to GitHub and open a Pull Request:**
   ```bash
   git push origin feature/your-feature-name
   ```
   Navigate to [GitHub Repository](https://github.com/charmeey/Charmeey_AI-SaaS_FullStack) to open a Pull Request.

---

## License

MIT
