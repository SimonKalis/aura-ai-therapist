/**
 * AURA — Node backend s pamäťou používateľa
 *
 * Endpointy:
 *   POST /api/chat          → jedna odpoveď Aury (gpt-4o-mini + profil používateľa)
 *   POST /api/end-session   → extrahuje profil z konverzácie, uloží ho
 *   GET  /api/profile/:uid  → vráti profil (na debug / export pre GDPR)
 *   DELETE /api/profile/:uid → zmaže profil (GDPR "right to be forgotten")
 *
 * Profily sa ukladajú do data/profiles/{uid}.json.
 * V produkcii nahraď filesystem za Postgres/Redis.
 */

import express from "express";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data", "profiles");
fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: "500kb" }));
app.use(express.static(__dirname));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// ── Načítaj oba prompty z SYSTEM_PROMPT.md ───────────────────────────
const md = fs.readFileSync(path.join(__dirname, "SYSTEM_PROMPT.md"), "utf8");
const promptBlocks = [...md.matchAll(/```text\n([\s\S]*?)```/g)].map(m => m[1].trim());
if (promptBlocks.length < 2) {
  throw new Error("SYSTEM_PROMPT.md musí obsahovať 2 ```text bloky (chat + extrakcia).");
}
const [CHAT_PROMPT_TEMPLATE, EXTRACT_PROMPT] = promptBlocks;

// ── Default profil ───────────────────────────────────────────────────
const emptyProfile = () => ({
  oslovenie: null,
  styl_komunikacie: null,
  oblubene_techniky: [],
  nefunguju: [],
  temy: [],
  kluc_udalosti: [],
  silne_stranky: [],
  posledne_sedenie_zhrnutie: "",
  pocet_sedeni: 0,
  posledny_datum: "",
});

// ── Profile I/O ──────────────────────────────────────────────────────
function profilePath(uid) {
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(uid)) throw new Error("Invalid uid");
  return path.join(DATA_DIR, `${uid}.json`);
}
async function loadProfile(uid) {
  try {
    const raw = await fsp.readFile(profilePath(uid), "utf8");
    return { ...emptyProfile(), ...JSON.parse(raw) };
  } catch {
    return emptyProfile();
  }
}
async function saveProfile(uid, profile) {
  await fsp.writeFile(profilePath(uid), JSON.stringify(profile, null, 2), "utf8");
}

// ── Rate limiting ────────────────────────────────────────────────────
const rateBuckets = new Map();
function rateLimit(ip, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const b = rateBuckets.get(ip) || { count: 0, reset: now + windowMs };
  if (now > b.reset) { b.count = 0; b.reset = now + windowMs; }
  b.count += 1;
  rateBuckets.set(ip, b);
  return b.count <= max;
}

// ── Build system prompt with user profile injected ───────────────────
function buildSystemPrompt(profile) {
  const hasData =
    profile.oslovenie ||
    profile.styl_komunikacie ||
    profile.oblubene_techniky.length ||
    profile.kluc_udalosti.length ||
    profile.posledne_sedenie_zhrnutie;

  const profileStr = hasData
    ? JSON.stringify(profile, null, 2)
    : "(nový používateľ — zatiaľ nemáš žiadne informácie)";

  return CHAT_PROMPT_TEMPLATE.replace("{{USER_PROFILE}}", profileStr);
}

// ── POST /api/chat ───────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const ip = req.ip || "unknown";
    if (!rateLimit(ip)) return res.status(429).json({ error: "Skús o chvíľu." });

    const { messages, uid } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing messages" });
    }
    if (!uid || typeof uid !== "string") {
      return res.status(400).json({ error: "Missing uid" });
    }

    const safeHistory = messages
      .slice(-40)
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

    const profile = await loadProfile(uid);
    const systemPrompt = buildSystemPrompt(profile);

    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.8,
      presence_penalty: 0.3,
      frequency_penalty: 0.2,
      max_tokens: 400,
      messages: [{ role: "system", content: systemPrompt }, ...safeHistory],
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Empty completion");

    // Hint klientovi, či by mal navrhnúť ukončenie (po 18 výmenách)
    const turns = safeHistory.filter(m => m.role === "user").length;
    const suggestClose = turns >= 18;

    res.json({ reply, suggestClose, turns });
  } catch (err) {
    console.error("[/api/chat]", err);
    res.status(500).json({ error: "internal" });
  }
});

// ── POST /api/end-session ────────────────────────────────────────────
// Keď používateľ ukončí konverzáciu, extrahujeme z nej fakty do profilu.
app.post("/api/end-session", async (req, res) => {
  try {
    const { messages, uid } = req.body || {};
    if (!uid || !Array.isArray(messages) || messages.length < 2) {
      return res.json({ ok: false, reason: "too-short" });
    }

    const current = await loadProfile(uid);
    const today = new Date().toISOString().slice(0, 10);

    const userMsg = JSON.stringify({
      AKTUALNY_PROFIL: current,
      DNESNY_DATUM: today,
      KONVERZACIA: messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role, content: m.content.slice(0, 2000) })),
    });

    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: userMsg },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content;
    const parsed = JSON.parse(raw);

    // Zlúč s defaultmi, aby chýbajúce polia nerozbili schému
    const merged = { ...emptyProfile(), ...current, ...parsed };
    merged.pocet_sedeni = (current.pocet_sedeni || 0) + 1;
    merged.posledny_datum = today;

    await saveProfile(uid, merged);
    res.json({ ok: true, profile: merged });
  } catch (err) {
    console.error("[/api/end-session]", err);
    res.status(500).json({ ok: false, error: "internal" });
  }
});

// ── GET /api/profile/:uid (GDPR export) ──────────────────────────────
app.get("/api/profile/:uid", async (req, res) => {
  try {
    const profile = await loadProfile(req.params.uid);
    res.json(profile);
  } catch {
    res.status(400).json({ error: "bad uid" });
  }
});

// ── DELETE /api/profile/:uid (GDPR erasure) ──────────────────────────
app.delete("/api/profile/:uid", async (req, res) => {
  try {
    await fsp.unlink(profilePath(req.params.uid)).catch(() => {});
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "bad uid" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌙 Aura beží na http://localhost:${PORT}`);
  console.log(`   model: ${MODEL}`);
  console.log(`   profily: ${DATA_DIR}`);
});
