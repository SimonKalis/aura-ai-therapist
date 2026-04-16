/* =========================================================
   AURA — landing + chat (demo + unlock + real API)
   - Scroll reveal, stat counters, hero preview loop, waitlist
   - Chat: demo mode (scripted) by default
   - Unlock flow: enter access code → real Claude Haiku via /api/chat
   - Profile persisted in localStorage, extracted via /api/extract
   ========================================================= */

// ────────────────────────────────────────────────────────
// CONFIG
// ────────────────────────────────────────────────────────

// If you run the frontend on Vercel, leave "" (same-origin /api/...).
// If you host it elsewhere (GitHub Pages, custom domain), set this to
// your Vercel deployment URL, e.g. "https://aura-ai-therapist.vercel.app"
const API_BASE = "";

const LS_CODE = "aura_access_code";
const LS_PROFILE = "aura_profile";
const TURN_LIMIT = 15;

// ────────────────────────────────────────────────────────
// ELEMENTS
// ────────────────────────────────────────────────────────

const chatEl = document.getElementById("chat");
const messagesEl = document.getElementById("messages");
const composer = document.getElementById("composer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const closeBtn = document.getElementById("closeBtn");
const crisisBtn = document.getElementById("crisisBtn");
const unlockBtn = document.getElementById("unlockBtn");
const presenceState = document.getElementById("presenceState");
const disclaimer = document.getElementById("disclaimer");
const disclaimerText = document.getElementById("disclaimerText");
const disclaimerAction = document.getElementById("disclaimerAction");

const crisisModal = document.getElementById("crisisModal");
const closeCrisis = document.getElementById("closeCrisis");

const unlockModal = document.getElementById("unlockModal");
const closeUnlock = document.getElementById("closeUnlock");
const unlockForm = document.getElementById("unlockForm");
const unlockCodeInput = document.getElementById("unlockCodeInput");
const unlockError = document.getElementById("unlockError");
const unlockStatus = document.getElementById("unlockStatus");
const unlockTitle = document.getElementById("unlockTitle");
const unlockSub = document.getElementById("unlockSub");
const relockBtn = document.getElementById("relockBtn");

const waitlistModal = document.getElementById("waitlistModal");
const closeWaitlist = document.getElementById("closeWaitlist");
const waitlistForm = document.getElementById("waitlistForm");
const waitlistEmail = document.getElementById("waitlistEmail");
const waitlistDone = document.getElementById("waitlistDone");
const waitCountEl = document.getElementById("waitCount");

const heroDemoBtn = document.getElementById("heroDemoBtn");
const navDemoBtn = document.getElementById("navDemoBtn");
const footerDemoBtn = document.getElementById("footerDemoBtn");

// ────────────────────────────────────────────────────────
// STATE
// ────────────────────────────────────────────────────────

const state = {
  history: [],
  sending: false,
  turns: 0,
};

// ────────────────────────────────────────────────────────
// SCROLL REVEAL
// ────────────────────────────────────────────────────────

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); revealObserver.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// ────────────────────────────────────────────────────────
// STAT COUNTERS
// ────────────────────────────────────────────────────────

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = parseInt(el.dataset.count, 10);
    const duration = 1600;
    const start = performance.now();
    const format = (n) => {
      if (target >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M+";
      if (target >= 1_000) return (n / 1_000).toFixed(0) + "k+";
      return Math.round(n).toString();
    };
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target >= 100 ? format(target) : target + "%";
    }
    requestAnimationFrame(tick);
    countObserver.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll("[data-count]").forEach((el) => countObserver.observe(el));

// ────────────────────────────────────────────────────────
// NAV SCROLL SHADOW
// ────────────────────────────────────────────────────────

const nav = document.querySelector(".nav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 20);
});

// ────────────────────────────────────────────────────────
// HERO PREVIEW LOOP
// ────────────────────────────────────────────────────────

const previewMessages = document.getElementById("previewMessages");
const previewScript = [
  { role: "user",  text: "Mám pocit, že nič nestíham a všetko ma vyčerpáva." },
  { role: "aura",  text: "Znie to ako tlak zo všetkých strán naraz. Čo ti dnes sedí na pleciach najviac?" },
  { role: "user",  text: "Asi tá práca. Neviem povedať nie." },
  { role: "aura",  text: "Čo si myslíš, že by sa stalo, keby si povedal nie?" },
];

async function runPreviewLoop() {
  while (true) {
    previewMessages.innerHTML = "";
    for (const m of previewScript) {
      await sleep(m.role === "aura" ? 1100 : 700);
      if (m.role === "aura") {
        const typing = document.createElement("div");
        typing.className = "p-typing";
        typing.innerHTML = `<span></span><span></span><span></span>`;
        previewMessages.appendChild(typing);
        await sleep(1400);
        typing.remove();
      }
      const el = document.createElement("div");
      el.className = `p-msg p-${m.role}`;
      el.textContent = m.text;
      if (m.role === "aura") {
        const lbl = document.createElement("div");
        lbl.className = "p-label";
        lbl.textContent = "Aura";
        el.prepend(lbl);
      }
      previewMessages.appendChild(el);
      await sleep(900);
    }
    await sleep(3000);
  }
}
runPreviewLoop();

// ────────────────────────────────────────────────────────
// WAITLIST
// ────────────────────────────────────────────────────────

let waitCount = 2847;
setInterval(() => {
  if (Math.random() < 0.4) {
    waitCount += 1;
    waitCountEl.textContent = waitCount.toLocaleString("sk-SK");
  }
}, 4000);

document.querySelectorAll("[data-waitlist]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    waitlistModal.classList.remove("hidden");
    setTimeout(() => waitlistEmail.focus(), 200);
  });
});
closeWaitlist.addEventListener("click", () => waitlistModal.classList.add("hidden"));
waitlistModal.addEventListener("click", (e) => {
  if (e.target === waitlistModal) waitlistModal.classList.add("hidden");
});
waitlistForm.addEventListener("submit", (e) => {
  e.preventDefault();
  waitlistForm.classList.add("hidden");
  waitlistDone.classList.remove("hidden");
  waitCount += 1;
  waitCountEl.textContent = waitCount.toLocaleString("sk-SK");
  setTimeout(() => {
    waitlistModal.classList.add("hidden");
    setTimeout(() => {
      waitlistForm.reset();
      waitlistForm.classList.remove("hidden");
      waitlistDone.classList.add("hidden");
    }, 400);
  }, 2200);
});

// ────────────────────────────────────────────────────────
// UNLOCK FLOW
// ────────────────────────────────────────────────────────

const getCode = () => localStorage.getItem(LS_CODE) || "";
const setCode = (c) => c ? localStorage.setItem(LS_CODE, c) : localStorage.removeItem(LS_CODE);
const isUnlocked = () => !!getCode();

function openUnlockModal() {
  if (isUnlocked()) {
    // Show status, not form
    unlockTitle.textContent = "Plná verzia je aktívna";
    unlockSub.classList.add("hidden");
    unlockForm.classList.add("hidden");
    unlockError.classList.add("hidden");
    unlockStatus.classList.remove("hidden");
  } else {
    unlockTitle.textContent = "Odomknúť plnú verziu";
    unlockSub.classList.remove("hidden");
    unlockForm.classList.remove("hidden");
    unlockStatus.classList.add("hidden");
    unlockError.classList.add("hidden");
    unlockCodeInput.value = "";
    setTimeout(() => unlockCodeInput.focus(), 100);
  }
  unlockModal.classList.remove("hidden");
}
function closeUnlockModal() { unlockModal.classList.add("hidden"); }

unlockBtn.addEventListener("click", openUnlockModal);
closeUnlock.addEventListener("click", closeUnlockModal);
unlockModal.addEventListener("click", (e) => { if (e.target === unlockModal) closeUnlockModal(); });

unlockForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = unlockCodeInput.value.trim();
  if (!code) return;
  // Optimistic client save. Server validates on first real API call.
  setCode(code);
  unlockError.classList.add("hidden");
  applyUnlockState();
  closeUnlockModal();
  // If chat is open, update welcome/state subtly
  if (!chatEl.classList.contains("hidden") && state.history.length === 0) {
    messagesEl.innerHTML = "";
    addMessage("aura", welcomeForMode());
  }
});

relockBtn.addEventListener("click", () => {
  if (!confirm("Zamknúť? Odhlási ťa z plnej verzie (profil v prehliadači zostane).")) return;
  setCode("");
  applyUnlockState();
  closeUnlockModal();
});

function applyUnlockState() {
  const unlocked = isUnlocked();
  chatEl.classList.toggle("unlocked", unlocked);
  unlockBtn.classList.toggle("unlocked", unlocked);
  unlockBtn.title = unlocked ? "Plná verzia aktívna" : "Odomknúť plnú verziu";
  if (unlocked) {
    presenceState.textContent = "online · Claude Haiku 4.5";
    disclaimerText.innerHTML =
      "Plná verzia aktívna — skutočná AI terapeutka. Nie je náhrada za licencovanú starostlivosť.";
    disclaimerAction.textContent = "Správa prístupu";
  } else {
    presenceState.textContent = "demo · scriptované odpovede";
    disclaimerText.innerHTML = "Demo — odpovede sú vopred pripravené.";
    disclaimerAction.textContent = "Mám prístupový kód";
  }
}
disclaimerAction.addEventListener("click", openUnlockModal);

// ────────────────────────────────────────────────────────
// PROFILE (localStorage)
// ────────────────────────────────────────────────────────

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
function loadProfile() {
  try {
    const raw = localStorage.getItem(LS_PROFILE);
    if (!raw) return emptyProfile();
    return { ...emptyProfile(), ...JSON.parse(raw) };
  } catch { return emptyProfile(); }
}
function saveProfile(p) {
  localStorage.setItem(LS_PROFILE, JSON.stringify(p));
}

// ────────────────────────────────────────────────────────
// CHAT OPEN / CLOSE
// ────────────────────────────────────────────────────────

function welcomeForMode() {
  if (!isUnlocked()) {
    return "Som Aura. Toto je demo — odpovede sú vopred pripravené. " +
           "Ak máš prístupový kód, klikni na zámok hore a odomkni plnú verziu.";
  }
  const p = loadProfile();
  if (!p.pocet_sedeni) {
    return "Som rada, že si tu. Nemusíš začínať ničím veľkým — stačí jedna veta o tom, čo ťa dnes priviedlo.";
  }
  if (p.oslovenie) {
    return `Dobré, že si späť, ${p.oslovenie}. Ako si dnes prišiel/prišla?`;
  }
  return "Dobré, že si späť. Chceš nadviazať na to, kde sme skončili, alebo začať niečím iným?";
}

function openDemo() {
  chatEl.classList.remove("hidden");
  messagesEl.innerHTML = "";
  state.history = [];
  state.turns = 0;
  applyUnlockState();
  addMessage("aura", welcomeForMode());
  document.body.style.overflow = "hidden";
  setTimeout(() => input.focus(), 300);
}
function closeDemo() {
  chatEl.classList.add("hidden");
  document.body.style.overflow = "";
  // If unlocked + meaningful conversation, run background profile extraction
  if (isUnlocked() && state.history.length >= 4) {
    extractProfileBg().catch(() => {});
  }
  state.history = [];
  state.turns = 0;
  messagesEl.innerHTML = "";
}
[heroDemoBtn, navDemoBtn, footerDemoBtn].forEach((b) =>
  b && b.addEventListener("click", (e) => { e.preventDefault(); openDemo(); })
);
closeBtn.addEventListener("click", closeDemo);
crisisBtn.addEventListener("click", () => crisisModal.classList.remove("hidden"));
closeCrisis.addEventListener("click", () => crisisModal.classList.add("hidden"));
crisisModal.addEventListener("click", (e) => { if (e.target === crisisModal) crisisModal.classList.add("hidden"); });

// ────────────────────────────────────────────────────────
// COMPOSER
// ────────────────────────────────────────────────────────

function autoresize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
  sendBtn.disabled = input.value.trim().length === 0 || state.sending;
}
input.addEventListener("input", autoresize);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); composer.requestSubmit(); }
});

composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || state.sending) return;
  addMessage("user", text);
  state.history.push({ role: "user", content: text });
  state.turns += 1;
  input.value = "";
  autoresize();
  await respond();
});

async function respond() {
  state.sending = true;
  sendBtn.disabled = true;
  const typing = showTyping();

  try {
    let reply;
    if (isUnlocked()) {
      const data = await callApi();
      reply = data.reply;
      if (data.suggestClose) setTimeout(hintClose, 800);
    } else {
      await sleep(900 + Math.random() * 900);
      reply = scriptedReply(state.history[state.history.length - 1].content);
    }
    typing.remove();
    addMessage("aura", reply);
    state.history.push({ role: "assistant", content: reply });
  } catch (err) {
    typing.remove();
    console.error(err);
    addMessage("aura", err.userMessage ||
      "Prepáč, niečo sa pokazilo pri spojení s AI. Skús to o chvíľu znova. " +
      "Ak je to naliehavé, volaj 0800 800 566 alebo 112.");
  } finally {
    state.sending = false;
    sendBtn.disabled = input.value.trim().length === 0;
    input.focus();
  }
}

function hintClose() {
  if (state.history.some(m => m.role === "assistant" && m.content.includes("Navrhujem"))) return;
  addMessage("aura",
    "Dnes sme sa dotkli dôležitej veci. Navrhujem uzavrieť tu — nabudúce sa k tomu " +
    "vrátime s čerstvou hlavou a budem si pamätať, kde sme skončili."
  );
}

// ────────────────────────────────────────────────────────
// REAL API CALL
// ────────────────────────────────────────────────────────

async function callApi() {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Access-Code": getCode(),
    },
    body: JSON.stringify({
      messages: state.history,
      profile: loadProfile(),
    }),
  });
  if (res.status === 401) {
    setCode("");
    applyUnlockState();
    const err = new Error("unauthorized");
    err.userMessage = "Prístupový kód neplatí. Skús ho zadať znova cez zámok hore.";
    throw err;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function extractProfileBg() {
  const res = await fetch(`${API_BASE}/api/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Access-Code": getCode(),
    },
    body: JSON.stringify({
      messages: state.history,
      currentProfile: loadProfile(),
    }),
  });
  if (!res.ok) return;
  const { profile } = await res.json();
  if (profile) saveProfile(profile);
}

// ────────────────────────────────────────────────────────
// SCRIPTED DEMO REPLIES
// ────────────────────────────────────────────────────────

function scriptedReply(text) {
  const t = text.toLowerCase();
  if (/samovra|ubl[íi]ž|neznesiem|ublizit/.test(t))
    return "To, čo opisuješ, je veľmi dôležité. Prosím, ozvi sa hneď: " +
      "Linka dôvery Nezábudka 0800 800 566 (24/7), alebo 112.";
  if (/úzkos|uzkos|panik|strach/.test(t))
    return "Počujem, že úzkosť je teraz blízko. Skús uzemniť telo: pomenuj 5 vecí, ktoré vidíš okolo seba. Čo je prvé?";
  if (/smut|depres|prázdn|prazdn/.test(t))
    return "Znie to ťažko — akoby sa v tebe niečo zastavilo. Čo sa v tebe deje, keď tie pocity prichádzajú?";
  if (/práca|praca|šéf|sef|stres/.test(t))
    return "Znie to vyčerpávajúco. Ktorá časť tej situácie má na teba najväčšiu váhu?";
  if (/vzťah|vztah|partner|rozchod/.test(t))
    return "Vzťahy spúšťajú hlboké pocity. Čo by si potreboval, aby tento vzťah teraz priniesol?";
  if (/kod|kód|odomk|unlock/.test(t))
    return "Klikni na zámok hore v chate a zadaj prístupový kód — prepne ťa na reálnu Auru.";
  return "Ďakujem, že si to zdieľaš. Skús mi povedať trochu viac — čo sa v tebe deje, keď si na to spomenieš? " +
    "(demo režim — scriptovaná odpoveď)";
}

// ────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────

function addMessage(role, text) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
}
function showTyping() {
  const el = document.createElement("div");
  el.className = "typing";
  el.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
  messagesEl.appendChild(el);
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
  return el;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Smooth scroll for hash links
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (href === "#" || href.length < 2) return;
    const el = document.querySelector(href);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// ESC closes modals / chat
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  waitlistModal.classList.add("hidden");
  crisisModal.classList.add("hidden");
  unlockModal.classList.add("hidden");
  if (!chatEl.classList.contains("hidden")) closeDemo();
});

// ────────────────────────────────────────────────────────
// PARTICLES BACKGROUND
// ────────────────────────────────────────────────────────

(function particles() {
  const canvas = document.getElementById("particles");
  const ctx = canvas.getContext("2d");
  let w, h, dots = [];
  const DOT_COUNT = 40;

  function resize() {
    w = canvas.width = window.innerWidth * devicePixelRatio;
    h = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }
  function make() {
    dots = Array.from({ length: DOT_COUNT }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.4 + 0.4,
      hue: Math.random() < 0.5 ? "184,167,255" : "125,224,255",
      a: Math.random() * 0.5 + 0.2,
    }));
  }
  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0 || d.x > w) d.vx *= -1;
      if (d.y < 0 || d.y > h) d.vy *= -1;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${d.hue}, ${d.a})`;
      ctx.shadowColor = `rgba(${d.hue}, 0.7)`;
      ctx.shadowBlur = 8 * devicePixelRatio;
      ctx.arc(d.x, d.y, d.r * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const a = dots[i], b = dots[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxD = 150 * devicePixelRatio;
        if (dist < maxD) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(184,167,255,${0.1 * (1 - dist / maxD)})`;
          ctx.lineWidth = 0.6 * devicePixelRatio;
          ctx.shadowBlur = 0;
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", () => { resize(); make(); });
  resize(); make(); tick();
})();
