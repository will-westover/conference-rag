import "@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

// POST { question, context_talks: [{ title, speaker, text }] } → { answer }. Called by generateAnswer() in app.js.
Deno.serve(async (req) => {
  // Same CORS preflight answer as embed-question.
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // TODO: same auth check as embed-question (requireAuth → return auth.error if it failed)

  try {
    // TODO: const { question, context_talks } = await req.json(); 400 if question is missing or context_talks isn't a non-empty array

    // TODO: get OPENAI_API_KEY from Deno.env, 500 if missing (same as embed-question)

    // TODO: build one context string: each talk as "Talk N: <title> — <speaker>\n<text>", joined with blank lines

    // TODO: write the system prompt: answer ONLY from these talks, cite talk titles, and say so if they don't cover the question

    // TODO: fetch("https://api.openai.com/v1/chat/completions", ...) with the same headers as embed-question

    // TODO: body: { model: "gpt-4o", messages: [{ role: "system", content: prompt }, { role: "user", content: context + "\n\nQuestion: " + question }] }

    // TODO: if (!response.ok) return the OpenAI error with its status (same as embed-question)

    // TODO: return json({ answer: data.choices[0].message.content })
    return json({ error: "generate-answer is not implemented yet" }, 501); // delete once the TODOs are done
  } catch (err) {
    // Anything unexpected becomes a 500 instead of crashing the function.
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
