/**
 * /api/extract — Vercel serverless
 * Po ukončení sedenia extrahuje JSON profil používateľa cez Claude Haiku.
 */

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 500;
const MAX_HISTORY = 30;
const MAX_MSG_CHARS = 2000;

const EXTRACT_PROMPT = `Si analytik, ktorý číta konverzáciu medzi človekom a AI sprievodkyňou Aurou.
Tvojou jedinou úlohou je aktualizovať JSON profil používateľa.

Vstup obsahuje: AKTUALNY_PROFIL, DNESNY_DATUM, KONVERZACIA.

Vráť VÝLUČNE validný JSON objekt (žiadny markdown, žiadne komentáre) v tejto schéme:

{
  "oslovenie": null | string,
  "styl_komunikacie": null | string,
  "oblubene_techniky": string[],
  "nefunguju": string[],
  "temy": string[],
  "kluc_udalosti": string[],
  "silne_stranky": string[],
  "posledne_sedenie_zhrnutie": string,
  "pocet_sedeni": number,
  "posledny_datum": string
}

Pravidlá:
• Zachovaj existujúce hodnoty, iba pridávaj / upresňuj.
• Duplikáty zlúč. Každé pole max 6 položiek.
• "oslovenie": iba ak sa človek explicitne predstavil.
• "styl_komunikacie": 1 veta o preferovanom štýle.
• "oblubene_techniky": na ktoré pozitívne reagoval.
• "nefunguju": explicitne odmietol.
• "temy": hlavné oblasti života.
• "kluc_udalosti": konkrétne fakty, bez dohadov.
• "silne_stranky": zdroje zvládania.
• "posledne_sedenie_zhrnutie": 1–2 vety.
• "pocet_sedeni": AKTUALNY_PROFIL.pocet_sedeni + 1.
• "posledny_datum": použi DNESNY_DATUM.
• NIKDY si nevymýšľaj, nikdy nepridávaj diagnózy.

Výstup: IBA JSON objekt.`;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Access-Code");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY missing");
    return res.status(500).json({ error: "Chýba API kľúč." });
  }
  if (!process.env.ACCESS_CODE) {
    return res.status(500).json({ error: "Chýba access code." });
  }

  const code = req.headers["x-access-code"];
  if (!code || code !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: "Neplatný prístupový kód." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: "Nevalidný JSON." }); }
  }
  const { messages, currentProfile } = body || {};
  if (!Array.isArray(messages) || messages.length < 2) {
    return res.status(400).json({ error: "Príliš krátka konverzácia." });
  }

  const today = new Date().toISOString().slice(0, 10);
  const userPayload = JSON.stringify({
    AKTUALNY_PROFIL: currentProfile || {},
    DNESNY_DATUM: today,
    KONVERZACIA: messages
      .slice(-MAX_HISTORY)
      .filter(m => m && (m.role === "user" || m.role === "assistant"))
      .map(m => ({ role: m.role, content: String(m.content).slice(0, MAX_MSG_CHARS) })),
  });

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
        system: EXTRACT_PROMPT,
        messages: [{ role: "user", content: userPayload }],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("Anthropic error", r.status, errText);
      return res.status(502).json({ error: "Extrakcia zlyhala.", details: errText.slice(0, 200) });
    }

    const data = await r.json();
    const raw = data.content?.[0]?.text?.trim();
    if (!raw) return res.status(502).json({ error: "Prázdna odpoveď." });

    const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "").trim();
    let profile;
    try { profile = JSON.parse(cleaned); }
    catch (e) {
      console.error("JSON parse failed:", cleaned.slice(0, 200));
      return res.status(502).json({ error: "AI vrátila nevalidný JSON." });
    }

    profile.pocet_sedeni = (currentProfile?.pocet_sedeni || 0) + 1;
    profile.posledny_datum = today;

    return res.status(200).json({ profile, usage: data.usage });
  } catch (err) {
    console.error("[/api/extract] crashed:", err?.message, err?.stack);
    return res.status(500).json({ error: "Internal error: " + (err?.message || "unknown") });
  }
}
