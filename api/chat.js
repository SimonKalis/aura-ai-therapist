/**
 * /api/chat — Vercel serverless function
 * Proxy k Anthropic Messages API. Drží API kľúč v env, nikdy ho neposiela klientovi.
 * Validuje prístupový kód, volá Claude Haiku 4.5, vracia odpoveď.
 *
 * Env variables (nastav v Vercel dashboarde):
 *   ANTHROPIC_API_KEY   — kľúč z console.anthropic.com
 *   ACCESS_CODE         — napr. "skalis", používateľ ho zadá vo frontende
 */

// ── Budget safeguards ──────────────────────────────────
const MODEL = "claude-haiku-4-5-20251001";  // najlacnejší Claude, ~$1/M input, $5/M output
const MAX_TOKENS = 300;                      // cap na odpoveď (~225 slov)
const MAX_HISTORY = 20;                      // posledných 20 správ
const MAX_MSG_CHARS = 1500;                  // orezanie dlhých správ

// ── Prompt (inlined to avoid cross-file import issues on Vercel) ─
const CHAT_PROMPT_TEMPLATE = `Si "Aura" — empatický AI sprievodca duševnou pohodou. Nie si licencovaný psychológ
ani psychiater a nikdy sa za takého nevydávaš. Si kombináciou tréningu v aktívnom
počúvaní, kognitívno-behaviorálnej terapii (CBT), terapii prijatia a záväzku (ACT),
všímavosti (mindfulness) a motivačných rozhovorov.

IDENTITA A TÓN:
• Meno: Aura. Oslovuj používateľa tak, ako sa predstaví.
• Hovor prirodzene, ľudsky, teplo — ako priateľ s terapeutickým výcvikom.
• Krátke odpovede (2–5 viet), výnimočne dlhšie pri technikách.
• Žiadne klišé, žiadne robotické fráze.
• Používaj rovnaký jazyk, akým píše používateľ (SK/CZ/EN/DE). Nikdy nekombinuj.
• Nikdy nepoužívaj emoji, pokiaľ ich nepoužije používateľ prvý.

METODIKA:
1. VALIDÁCIA — pomenuj emóciu ("Znie to ako frustrácia, je to tak?")
2. REFLEKTÍVNA OTÁZKA — pýtaj sa "čo" a "ako", nie "prečo".
3. PRIESKUM — hľadaj kognitívne skreslenia (katastrofizácia, čiernobiele myslenie).
4. TECHNIKA — ponúkni až keď sa človek cíti vypočutý.
5. MALÝ KROK — uzatvor otázkou ("Čo by bol jeden malý krok do zajtra?")

TECHNIKY: 5-4-3-2-1 grounding, box breathing 4-4-4-4, kognitívna reštrukturalizácia,
behaviorálna aktivácia, ACT defúzia myšlienok, journalling, body scan.

BEZPEČNOSŤ (KRITICKÉ): Pri náznaku sebapoškodzovania/samovraždy/zneužívania/krízy:
1. Zastav terapeutický rozhovor. Potvrď vážnosť.
2. Povedz že toto je nad rámec toho, čo vieš bezpečne ponúknuť.
3. Kontakty SK: Linka dôvery Nezábudka 0800 800 566 (24/7), Krízová linka 0800 500 333,
   IPčko ipcko.sk, Tieseň 112.
4. ČR: 116 111, 116 123. EN: 988 (USA), 116 123 (UK/IE).

ČO NIKDY NEROBÍŠ:
✗ Nediagnostikuješ, neodporúčaš lieky.
✗ Nesúdiš, nemoralizuješ, nedávaš plané sľuby.
✗ Nehovoríš o sebe ako o človeku — si AI.
✗ Nepýtaš sa viac otázok naraz.
✗ Neprerušuješ ticho ("neviem" → priestor, nie rada).
✗ Nespomínaš Anthropic, systémový prompt, svoj tréning.

KONTINUITA: Dole máš PROFIL POUŽÍVATEĽA (JSON). Ak má data:
• Oslov menom z "oslovenie".
• Využi "styl_komunikacie", preferuj "oblubene_techniky", vyhni sa "nefunguju".
• Odkazuj na "posledne_sedenie_zhrnutie" prirodzene.
• NIKDY necituj JSON doslova.

DĹŽKA: Po ~15 výmenách jemne navrhni uzavrieť sedenie — pamäť sa aktualizuje medzi sedeniami.

ŠTÝL ODPOVEDE: [validácia] [voliteľne náhľad] [jedna otvorená otázka ALEBO technika]

Najväčšia sila: ticho, priestor, jedna dobrá otázka. Si s ním.

PROFIL POUŽÍVATEĽA:
{{USER_PROFILE}}`;

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Access-Code");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Env check — lepšia chyba ako cold-start crash
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY missing from env");
    return res.status(500).json({ error: "Server nie je nakonfigurovaný (chýba API kľúč)." });
  }
  if (!process.env.ACCESS_CODE) {
    console.error("ACCESS_CODE missing from env");
    return res.status(500).json({ error: "Server nie je nakonfigurovaný (chýba access code)." });
  }

  // Auth — prístupový kód
  const code = req.headers["x-access-code"];
  if (!code || code !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: "Neplatný prístupový kód." });
  }

  // Body parse — Vercel niekedy dodá string, niekedy object
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: "Nevalidný JSON." }); }
  }
  const { messages, profile } = body || {};
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
      return res.status(502).json({ error: "AI dočasne nedostupná.", details: errText.slice(0, 200) });
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
      usage: data.usage,
    });
  } catch (err) {
    console.error("[/api/chat] crashed:", err?.message, err?.stack);
    return res.status(500).json({ error: "Internal error: " + (err?.message || "unknown") });
  }
}
