/* =========================================================
   AURA — landing page logic
   - Scroll reveal animations
   - Animated preview conversation (hero)
   - Animated stat counters
   - Waitlist modal
   - Demo chat (scripted, non-functional therapist)
   - Particle canvas background
   ========================================================= */

// ───────── Elements ─────────
const chatEl = document.getElementById("chat");
const messagesEl = document.getElementById("messages");
const composer = document.getElementById("composer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const closeBtn = document.getElementById("closeBtn");
const crisisBtn = document.getElementById("crisisBtn");
const crisisModal = document.getElementById("crisisModal");
const closeCrisis = document.getElementById("closeCrisis");

const waitlistModal = document.getElementById("waitlistModal");
const closeWaitlist = document.getElementById("closeWaitlist");
const waitlistForm = document.getElementById("waitlistForm");
const waitlistEmail = document.getElementById("waitlistEmail");
const waitlistDone = document.getElementById("waitlistDone");
const waitCountEl = document.getElementById("waitCount");

const heroDemoBtn = document.getElementById("heroDemoBtn");
const navDemoBtn = document.getElementById("navDemoBtn");
const footerDemoBtn = document.getElementById("footerDemoBtn");

// ───────── Scroll reveal ─────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// ───────── Stat counters ─────────
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

// ───────── Sticky nav shadow on scroll ─────────
const nav = document.querySelector(".nav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 20);
});

// ───────── Hero preview conversation (loops) ─────────
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

// ───────── Waitlist counter (ticks up slowly) ─────────
let waitCount = 2847;
setInterval(() => {
  if (Math.random() < 0.4) {
    waitCount += 1;
    waitCountEl.textContent = waitCount.toLocaleString("sk-SK");
  }
}, 4000);

// ───────── Waitlist modal ─────────
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
  // Fake submission — in production, POST to your backend / Mailchimp / Resend
  waitlistForm.classList.add("hidden");
  waitlistDone.classList.remove("hidden");
  waitCount += 1;
  waitCountEl.textContent = waitCount.toLocaleString("sk-SK");
  setTimeout(() => {
    waitlistModal.classList.add("hidden");
    // reset for next time
    setTimeout(() => {
      waitlistForm.reset();
      waitlistForm.classList.remove("hidden");
      waitlistDone.classList.add("hidden");
    }, 400);
  }, 2200);
});

// ───────── Demo chat (scripted, non-functional) ─────────
function openDemo() {
  chatEl.classList.remove("hidden");
  messagesEl.innerHTML = "";
  addMessage("aura",
    "Som Aura. Toto je demo — odpovede sú vopred pripravené. Plná verzia čoskoro. " +
    "Napíš mi, čo ťa dnes priviedlo, a uvidíš ukážku toho, ako sa rozprávam."
  );
  document.body.style.overflow = "hidden";
  setTimeout(() => input.focus(), 300);
}
function closeDemo() {
  chatEl.classList.add("hidden");
  messagesEl.innerHTML = "";
  document.body.style.overflow = "";
}
[heroDemoBtn, navDemoBtn, footerDemoBtn].forEach((b) =>
  b && b.addEventListener("click", (e) => { e.preventDefault(); openDemo(); })
);
closeBtn.addEventListener("click", closeDemo);

crisisBtn.addEventListener("click", () => crisisModal.classList.remove("hidden"));
closeCrisis.addEventListener("click", () => crisisModal.classList.add("hidden"));
crisisModal.addEventListener("click", (e) => {
  if (e.target === crisisModal) crisisModal.classList.add("hidden");
});

// Textarea autoresize
function autoresize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
  sendBtn.disabled = input.value.trim().length === 0;
}
input.addEventListener("input", autoresize);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); composer.requestSubmit(); }
});

composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMessage("user", text);
  input.value = "";
  autoresize();

  const typing = showTyping();
  await sleep(1100 + Math.random() * 900);
  typing.remove();
  addMessage("aura", scriptedReply(text));
});

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
  if (/waitlist|cena|kedy/.test(t))
    return "Plná verzia štartuje v máji 2026. Pridaj sa na waitlist — dostaneš prístup o týždeň skôr.";
  return "Ďakujem, že si to zdieľaš. Skús mi povedať trochu viac — čo sa v tebe deje, keď si na to spomenieš?";
}

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

// ───────── Smooth scroll for nav links ─────────
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

// ───────── ESC closes modals ─────────
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  waitlistModal.classList.add("hidden");
  crisisModal.classList.add("hidden");
  if (!chatEl.classList.contains("hidden")) closeDemo();
});

// ───────── Particles ─────────
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
