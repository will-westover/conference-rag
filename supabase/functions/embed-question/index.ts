import "@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

// POST { question } → { embedding: number[1536] }. Called by getEmbedding() in app.js.
Deno.serve(async (req) => {
  // The browser sends an OPTIONS "preflight" before the real request to ask if cross-origin calls are allowed.
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // TODO: const auth = await requireAuth(req); if ("error" in auth) return auth.error;

  try {
    // TODO: const { question } = await req.json(); return json({ error: ... }, 400) if it's missing or not a string

    // TODO: const openaiKey = Deno.env.get("OPENAI_API_KEY"); return a 500 if it isn't set

    // TODO (Step 07 cache, optional): hash the normalized question and return the cached embedding from question_cache if found

    // TODO: fetch("https://api.openai.com/v1/embeddings", { method: "POST", headers: Authorization: `Bearer ${openaiKey}` + Content-Type: application/json, ... })

    // TODO: body: JSON.stringify({ model: "text-embedding-3-small", input: question })

    // TODO: if (!response.ok) return json({ error: <OpenAI's error message> }, response.status)

    // TODO: const data = await response.json(); the vector is at data.data[0].embedding

    // TODO (Step 07 cache, optional): insert { question_hash, embedding } into question_cache with a service-role client

    // TODO: return json({ embedding })
    return json({ error: "embed-question is not implemented yet" }, 501); // delete once the TODOs are done
  } catch (err) {
    // Anything unexpected (bad JSON body, network failure) becomes a 500 instead of crashing the function.
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
