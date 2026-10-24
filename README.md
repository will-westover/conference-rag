# Conference RAG

A Retrieval Augmented Generation (RAG) application that lets users ask questions about General Conference talks using semantic search and AI-generated answers.

<p align="center">
  <img src="example.png" alt="Conference RAG screenshot" width="600">
  <br>
  <em>Sample screenshot — semantic search with AI-generated answers</em>
</p>

## 🚀 Quick Start

Follow the step-by-step guides in the `steps/` folder:

```
🏁 LAUNCH ──→ 🔐 SIGN IN ──→ 🔍 KEYWORD ──→ 🧠 SEMANTIC ──→ 🤖 RAG ──→ 🚀 YOURS
```

| Step | Milestone | Topic | Time |
|------|-----------|-------|------|
| [00](steps/00_overview.md) | — | Overview & Environment Setup | 15 min |
| [01](steps/01_fork_and_deploy.md) | 🏁 Launch | Fork & Deploy to GitHub Pages | 15 min |
| [02](steps/02_supabase_and_login.md) | 🔐 Sign In | Supabase Project & Login | 15 min |
| [03](steps/03_database_schema.md) | 🔍 Keyword (1/2) | Database Schema & RLS | 10 min |
| [04](steps/04_scrape_and_import.md) | 🔍 Keyword (2/2) | Scrape & Import → First green light! | 20 min |
| [05](steps/05_embeddings.md) | 🧠 Semantic | Embeddings & Edge Function | 25 min |
| [06](steps/06_rag.md) | 🤖 RAG | RAG Edge Function → All green! | 15 min |
| [07](steps/07_make_it_yours.md) | 🚀 Yours | Add Feature & Reflection | 20 min |

**Prerequisites:**
- [Supabase](https://supabase.com) account (free tier)
- [GitHub](https://github.com) account
- [OpenAI API key](https://platform.openai.com/api-keys) (~$0.60 usage)
- Python 3.9+
- An AI coding assistant (Antigravity, GitHub Copilot, or Cursor)

## 🤖 AI-Assisted Development

This assignment is designed to be completed with an AI coding assistant. See [Step 00](steps/00_overview.md) for setup instructions.

Your AI assistant will automatically read [`ai_agent_instructions.md`](ai_agent_instructions.md) to understand the assignment's learning objectives and teach you along the way.

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │  Student asks question
│  (GitHub    │
│   Pages)    │
└──────┬──────┘
       │
       ├─── Supabase Auth (magic link)
       │
       ├─── Edge Function: embed-question
       │         ↓ OpenAI API (server-side 🔒)
       │         ↓ Returns embedding vector
       │
       ├─── Supabase Database (pgvector)
       │         ↓ match_sentences()
       │         ↓ Returns similar sentences
       │
       └─── Edge Function: generate-answer
                ↓ GPT-4o (server-side 🔒)
                ↓ Returns final answer
```

## 🔍 Three Search Modes

| Mode | What it does | Requires |
|------|-------------|----------|
| **🔍 Keyword Search** | SQL `ILIKE` query on talk text | Conference data imported |
| **🧠 Semantic Search** | Vector similarity with pgvector | Embeddings + `embed-question` Edge Function |
| **🤖 Ask a Question (RAG)** | AI-generated answers with sources | All Edge Functions deployed |

## 📁 Project Structure

The frontend is **React + TypeScript**, built with **Vite** and deployed to GitHub Pages by GitHub Actions.

```
conference-rag/
├── index.html                  # Vite entry: just <div id="root"> + src/main.tsx
├── src/
│   ├── main.tsx                # Mounts <App/> into #root
│   ├── App.tsx                 # Login screen vs. app screen, based on the session
│   ├── lib/
│   │   ├── env.ts              # Validates config.public.json at startup
│   │   └── supabase.ts         # The one typed Supabase client
│   ├── types/database.ts       # Generated from the live schema (npm run gen:types)
│   ├── features/
│   │   ├── auth/               # useSession hook, LoginScreen
│   │   ├── search/             # Keyword / Semantic / RAG panels, api.ts, ranking.ts (+ tests)
│   │   ├── history/            # Step 07: per-user question history
│   │   └── setup/              # Setup banner, deploy time + page views
│   └── styles.css
├── config.public.json          # Supabase URL + anon key (safe to commit; read by app AND scripts)
├── config.secret.json          # API keys & secrets (git-ignored, YOU create this)
├── scripts/                    # Python data pipeline (run in order, see steps/)
├── supabase/
│   ├── functions/              # Edge Functions (Deno/TypeScript)
│   │   ├── _shared/            # CORS + auth helpers
│   │   ├── embed-question/
│   │   └── generate-answer/
│   └── migrations/             # Versioned SQL schema changes (supabase db push)
├── .github/workflows/deploy.yml  # CI: lint → test → typecheck + build → deploy to Pages
├── steps/                      # Step-by-step assignment guides
└── vite.config.ts, tsconfig*.json, eslint.config.js, .prettierrc.json
```

### Frontend commands

```bash
npm install          # once, after cloning
npm run dev          # http://localhost:5173/conference-rag/ with hot reload
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run build        # typecheck + production build into dist/
npm run gen:types    # regenerate src/types/database.ts after a schema change
```
## 🔒 Security Model

| Component | Security Approach |
|-----------|------------------|
| Supabase anon key | Safe to expose in `config.public.json` (protected by RLS) |
| OpenAI API key | Server-side only via Edge Functions (in `config.secret.json`) |
| Database access | Row Level Security policies |
| Transport | HTTPS enforced by GitHub Pages |

## 📚 Learning Objectives

1. **Vector Embeddings** — Representing text as searchable numbers
2. **Semantic Search** — Finding similar content with cosine similarity
3. **RAG Architecture** — Combining retrieval + generation
4. **Edge Functions** — Serverless compute for secure API management
5. **Row Level Security** — User-level data access control
6. **Production Deployment** — Full-stack app on GitHub Pages

## 🎓 Assignment Deliverables

1. GitHub repository URL (your fork)
2. Live deployment URL (GitHub Pages)
3. Screenshot of a working query + answer
4. Your custom feature description
5. Written reflection on security, search, and AI-assisted development

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Please configure Supabase" | Update `config.public.json` with your project URL and anon key |
| Magic link not working | Add your site URL to Supabase → Authentication → URL Configuration |
| Magic link email not arriving | Free tier allows only **3 per hour** — wait and try again, check spam |
| Changes don't appear | Hard refresh (Ctrl+Shift+R) or try incognito window |
| Search shows "Not Ready" | Complete the corresponding step first |
| "Failed to get embedding" | Deploy Edge Functions and set OPENAI_API_KEY secret |
| "Database search failed" | Run `scripts/01_create_schema.py` |
| No search results | Import data with `scripts/03_import_data.py` |

## 📄 License

Educational use only. Conference talk content is used under fair use for educational purposes.

---

Built with ❤️ for CS 452
