import "@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

// Longest question we'll embed. Caps what one request can cost us (~500 tokens).
const MAX_QUESTION_CHARS = 2000;

// POST { question } → { embedding: number[1536] }. Called by getEmbedding() in app.js.
Deno.serve(async (req) => {
  // The browser sends an OPTIONS "preflight" before the real request to ask if cross-origin calls are allowed.
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Reject anyone who isn't logged in before doing anything that costs money
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const { question } = await req.json();
    if (typeof question !== "string" || !question.trim()) {
      return json({ error: "Missing or invalid 'question' field" }, 400);
    }
    if (question.length > MAX_QUESTION_CHARS) {
      return json({ error: `Question is too long (max ${MAX_QUESTION_CHARS} characters)` }, 400);
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "OPENAI_API_KEY not configured" }, 500);

    // TODO (Step 07 cache, optional): hash the normalized question and return the cached embedding from question_cache if found

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      // Same model as scripts/04_embed_data.py; vectors from different models aren't comparable
      body: JSON.stringify({ model: "text-embedding-3-small", input: question.trim() }),
    });

    // 502 Bad Gateway = "a service behind me failed". Passing OpenAI's own status through would be misleading:
    // an OpenAI 401 (bad API key) would look to the browser like the USER's login had failed.
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return json({ error: `OpenAI error: ${err.error?.message ?? response.statusText}` }, 502);
    }

    const data = await response.json();
    const embedding: number[] = data.data[0].embedding;

    // TODO (Step 07 cache, optional): insert { question_hash, embedding } into question_cache with a service-role client

    return json({ embedding });
  } catch (err) {
    // Anything unexpected (bad JSON body, network failure) becomes a 500 instead of crashing the function.
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
