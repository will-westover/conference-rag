-- Step 07: private per-user question history, a server-only embedding cache, and an HNSW index.
-- Apply with `supabase db push`, which runs every migration in this folder that hasn't run yet.

-- TODO: create table question_history (id bigint generated always as identity primary key, user_id uuid not null default auth.uid() references auth.users on delete cascade, question text not null, answer text, created_at timestamptz not null default now());

-- TODO: alter table question_history enable row level security;  (without this line the policies below do nothing)

-- TODO: create policy "read own history" on question_history for select to authenticated using (user_id = auth.uid());

-- TODO: create policy "insert own history" on question_history for insert to authenticated with check (user_id = auth.uid());

-- TODO: create index on question_history (user_id, created_at desc);  (serves "show my last 20 questions")

-- TODO: create table question_cache (question_hash text primary key, embedding vector(1536) not null, created_at timestamptz not null default now());

-- TODO: alter table question_cache enable row level security;  then add NO policies, so only the service role (your Edge Function) can touch it

-- TODO: create index on sentence_embeddings using hnsw (embedding vector_cosine_ops);  (run after Step 05 loads the embeddings; it builds faster on a full table)
