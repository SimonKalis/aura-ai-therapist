/**
 * /api/chat — Vercel serverless function
 * Proxy k Anthropic Messages API. Drží API kľúč v env, nikdy ho neposiela klientovi.
 * Validuje prístupový kód, volá Claude Haiku 4.5, vracia odpoveď.
 *
 * Env variables (nastav v Vercel dashboarde):
 *   ANTHROPIC_API_KEY   — kľúč z console.anthropic.com
 *   ACCESS_CODE         — napr. "skalis", používateľ ho zadá vo frontende
 */

import { CHAT_PROMPT_TEMPLATE } from "../prompts.js";

// ── Budget safeguards ──────────────────────────────────
const MODEL = "claude-haiku-4-5-20251001";  // najlacnejší Claude, ~$1/M input, $5/M output
const MAX_TOKENS = 300;                  // cap na odpoveď (~225 slov)
const MAX_HISTORY = 20;                  // posledných 20 správ
const MAX_MSG_CHARS = 1500;              // orezanie dlhých správ

export default async function handler(req, res) {
  // CORS — povolené z GitHub Pages aj lokálneho dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Access-Code");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth — prístupový kód
  const code = req.headers["x-access-code"];
  if (!code || code !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: "Neplatný prístupový kód." });
  }

  const { messages, profile } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Chýbajú správy." });
  }

  // Sanitize & cap history
  const safeHistory = messages
    .slice(-MAX_HISTORY)
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MSG_CHARS) }));

  if (safeHistory.length === 0 || safeHistory[0].role !== "user") {
    return res.status(400).json({ error: "Prvá správa musí byť od user." });
  }

  // Inject profile into system prompt
  const hasProfile = profile && (
    profile.oslovenie || profile.styl_komunikacie ||
    profile.oblubene_techniky?.length || profile.kluc_udalosti?.length ||
    profile.posledne_sedenie_zhrnutie
  );
  const profileStr = hasProfile
    ? JSON.stringify(profile, null, 2)
    : "(nový používateľ — zatiaľ nemáš žiadne informácie)";
  const systemPrompt = CHAT_PROMPT_TEMPLATE.replace("{{USER_PROFILE}}", profileStr);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: safeHistory,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("Anthropic error", r.status, errText);
      return res.status(502).json({ error: "AI dočasne nedostupná." });
    }

    const data = await r.json();
    const reply = data.content?.[0]?.text?.trim();
    if (!reply) {
      return res.status(502).json({ error: "Prázdna odpoveď z AI." });
    }

    const turns = safeHistory.filter(m => m.role === "user").length;
    return res.status(200).json({
      reply,
      suggestClose: turns >= 15,
      usage: data.usage, // input_tokens / output_tokens pre debug
    });
  } catch (err) {
    console.error("[/api/chat]", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
