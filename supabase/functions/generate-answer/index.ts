import "@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

// Limits that cap what one request can cost. Three full talks are ~30k characters (~7k tokens).
const MAX_QUESTION_CHARS = 2000;
const MAX_TALKS = 5;
const MAX_CONTEXT_CHARS = 60_000;

interface ContextTalk {
  title: string;
  speaker: string;
  text: string;
}

const SYSTEM_PROMPT = `You answer questions about General Conference talks.

Rules:
- Use ONLY the talks provided inside <talk> tags. Do not use outside knowledge.
- Cite the talk title (and speaker) for every claim, e.g. (“Finding Personal Peace,” Henry B. Eyring).
- Only quote words that actually appear in the talks.
- Don't say when a talk was given (e.g. "the recent conference") unless the talk itself says so.
- If the talks don't answer the question, say so plainly instead of guessing.
- Write plain text with no Markdown (no **bold**, # headings, or bullet symbols); the app displays raw text.
- Be warm and concise: a few short paragraphs at most.`;

// POST { question, context_talks: [{ title, speaker, text }] } → { answer }. Called by generateAnswer() in app.js.
Deno.serve(async (req) => {
  // Same CORS preflight answer as embed-question.
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const { question, context_talks } = await req.json();

    if (typeof question !== "string" || !question.trim()) {
      return json({ error: "Missing or invalid 'question' field" }, 400);
    }
    if (question.length > MAX_QUESTION_CHARS) {
      return json({ error: `Question is too long (max ${MAX_QUESTION_CHARS} characters)` }, 400);
    }
    if (!Array.isArray(context_talks) || context_talks.length === 0 || !context_talks.every(isContextTalk)) {
      return json({ error: "'context_talks' must be a non-empty array of { title, speaker, text }" }, 400);
    }
    // The browser chooses this context, so cap it: otherwise a logged-in user could paste anything
    // and use our GPT-4o key as a free general-purpose chatbot.
    const talks = (context_talks as ContextTalk[]).slice(0, MAX_TALKS);
    if (talks.reduce((n, t) => n + t.text.length, 0) > MAX_CONTEXT_CHARS) {
      return json({ error: "Context is too large" }, 400);
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ error: "OPENAI_API_KEY not configured" }, 500);

    // Augment: wrap each talk in tags so the model can tell sources apart from instructions
    const context = talks
      .map((t, i) => `<talk number="${i + 1}" title="${t.title}" speaker="${t.speaker}">\n${t.text}\n</talk>`)
      .join("\n\n");

    // Generate
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.3, // low = sticks closer to the sources; high = more creative wording
        max_tokens: 700, // caps answer length (and output cost)
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${context}\n\nQuestion: ${question.trim()}` },
        ],
      }),
    });

    // 502 = a service behind us failed (see embed-question for why we don't pass OpenAI's status through)
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return json({ error: `OpenAI error: ${err.error?.message ?? response.statusText}` }, 502);
    }

    const data = await response.json();
    const answer: string | undefined = data.choices?.[0]?.message?.content;
    if (!answer) return json({ error: "OpenAI returned an empty answer" }, 502);

    return json({ answer });
  } catch (err) {
    // Anything unexpected becomes a 500 instead of crashing the function.
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function isContextTalk(t: unknown): t is ContextTalk {
  const talk = t as ContextTalk;
  return typeof talk?.title === "string" && typeof talk?.speaker === "string" && typeof talk?.text === "string";
}
