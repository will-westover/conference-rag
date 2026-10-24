-- Step 07: private per-user question history, a server-only embedding cache, and an HNSW index.
-- Apply with `supabase db push`, which runs every migration in this folder that hasn't run yet.

-- ============================================
-- QUESTION HISTORY (each user sees only their own rows)
-- ============================================
create table question_history (
    id bigint generated always as identity primary key,
    -- default auth.uid() fills in the caller's id from their JWT, so the browser never sends it
    user_id uuid not null default auth.uid() references auth.users on delete cascade,
    question text not null check (char_length(question) <= 2000),
    answer text,
    created_at timestamptz not null default now()
);

-- Without this line the policies below do nothing and every row is visible to everyone
alter table question_history enable row level security;

-- (select auth.uid()) instead of auth.uid(): Postgres evaluates it once per query instead of once per row
create policy "read own history" on question_history
    for select to authenticated
    using ((select auth.uid()) = user_id);

-- WITH CHECK validates the row being written: you can't insert a row stamped with someone else's id
create policy "insert own history" on question_history
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy "delete own history" on question_history
    for delete to authenticated
    using ((select auth.uid()) = user_id);

-- Serves the one query this table runs: "my most recent questions"
create index question_history_user_recent_idx on question_history (user_id, created_at desc);

-- ============================================
-- EMBEDDING CACHE (server only)
-- ============================================
-- Same question text → same vector, forever, so cached rows never go stale.
create table question_cache (
    question_hash text primary key,  -- sha-256 of the normalized question
    embedding vector(1536) not null,
    created_at timestamptz not null default now()
);

-- RLS on with NO policies = anon and authenticated can't touch it at all.
-- Only the embed-question Edge Function (service role, which bypasses RLS) reads and writes it.
alter table question_cache enable row level security;

-- ============================================
-- HNSW INDEX (approximate nearest-neighbor search)
-- ============================================
-- Without it, match_sentences() compares the question against every row: O(N) per search.
-- vector_cosine_ops must match the <=> (cosine distance) operator that match_sentences() uses.
create index sentence_embeddings_embedding_hnsw_idx
    on sentence_embeddings using hnsw (embedding vector_cosine_ops);
