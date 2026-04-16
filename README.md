# 🌙 Aura — AI sprievodca duševnou pohodou

Statická webstránka. Bez servera, bez databázy — stačí nahrať na Netlify / Vercel /
GitHub Pages / Cloudflare Pages a funguje. Používateľ si vloží svoj OpenAI API kľúč
a Aura beží priamo v prehliadači.

## Čo obsahuje

- **Futuristický frontend** — glassmorphism, animované orby, canvas particles, plynulé prechody.
- **Dva OpenAI prompty** — chat + extrakcia profilu (v `prompts.js`).
- **Pamäť o používateľovi** — po každom sedení sa z konverzácie extrahuje JSON profil
  (oslovenie, štýl komunikácie, obľúbené techniky ako dýchacie cvičenia, nefungujúce,
  kľúčové udalosti…) a uloží do `localStorage`.
- **Lacný model** — `gpt-4o-mini`, cca **1500 sedení za 1 USD** vrátane extrakcie.
- **Session banner** — po ~18 výmenách jemne navrhne uzavrieť sedenie a začať čerstvé.
- **GDPR-ready** — tlačidlá na export profilu (JSON) a zmazanie, všetko v nastaveniach.
- **Demo režim** — funguje bez API kľúča, skriptované odpovede.

## Štruktúra

```
ai-therapist/
├── index.html         ← landing + chat + všetky modaly
├── styles.css         ← futuristický dizajn a animácie
├── script.js          ← ES module, volá OpenAI priamo
├── prompts.js         ← chat prompt + extrakčný prompt
├── SYSTEM_PROMPT.md   ← dokumentácia promptov (zdroj pravdy)
├── server.js          ← voliteľný Node backend (ak nechceš key v prehliadači)
├── package.json       ← len ak používaš server mód
└── README.md
```

## Ako to lokálne spustiť

ES moduly potrebujú HTTP server (nefungujú cez `file://`). Najjednoduchšie:

```bash
cd ai-therapist
python3 -m http.server 8000
# alebo
npx serve
```

Otvor `http://localhost:8000`, klikni na ⚙ ikonu, vlož OpenAI API kľúč.

## Deploy (produkcia)

### Netlify / Vercel / Cloudflare Pages
1. Nahraj priečinok (drag & drop) alebo napoj cez GitHub repo.
2. Build command: **žiadny**. Publish directory: **root**.
3. Hotovo — klikni na doménu.

### GitHub Pages
1. Push do GitHub repa.
2. Settings → Pages → Source: `main` / `/root`.
3. Otvor `https://<user>.github.io/<repo>/`.

### Vlastný web / statický hosting
Skopíruj `index.html`, `styles.css`, `script.js`, `prompts.js` kamkoľvek kde vieš
servírovať statické súbory.

## Pre koho je client-side verzia vhodná

✅ Osobné použitie / rodina / priatelia<br>
✅ Demo pre klientov (každý si vloží svoj kľúč)<br>
✅ Developer tool / vlastný projekt<br>
✅ MVP pred tým, ako postavíš platený SaaS

❌ **Nie pre verejný produkt kde zarábaš** — každý návštevník by potreboval
vlastný OpenAI kľúč. Na komerčný SaaS použi `server.js` + billing (Stripe).

## Komerčný SaaS mód (Node backend)

Ak chceš účtovať používateľom a sám platiť OpenAI:

```bash
npm install
cp .env.example .env   # doplň OPENAI_API_KEY
npm start
```

Server proxyuje `/api/chat` a `/api/end-session`. Frontend `script.js` vie na to
prepnúť — stačí zameniť `fetch("https://api.openai.com/…")` za `fetch("/api/…")`.

## Pamäťový profil — príklad po 3 sedeniach

```json
{
  "oslovenie": "Martin",
  "styl_komunikacie": "Preferuje krátke, priame odpovede. Reaguje na metafory, nechce priveľa otázok naraz.",
  "oblubene_techniky": ["dýchacie cvičenia 4-4-4-4", "journalling prompty"],
  "nefunguju": ["vedená vizualizácia"],
  "temy": ["pracovný stres", "vzťah s otcom"],
  "kluc_udalosti": ["zmenil job v marci 2026", "otec v nemocnici"],
  "silne_stranky": ["beh 3× týždenne", "priateľ Tomáš"],
  "posledne_sedenie_zhrnutie": "Riešili sme hranice v práci, skončili s plánom povedať nie na víkendové emaily.",
  "pocet_sedeni": 3,
  "posledny_datum": "2026-04-16"
}
```

Tento profil sa pri ďalšom sedení vloží do system promptu — Aura Martina
osloví menom, navrhne dýchacie cvičenia namiesto vizualizácie a opýta sa
ako sa podarilo povedať nie na víkendové emaily.

## Bezpečnosť a súkromie

- API kľúč je v `localStorage` — **nikdy sa neposiela nikam okrem OpenAI**.
- Konverzácia sa **neukladá** — iba destilovaný profil.
- Export / zmazanie profilu je priamo v settings.
- V UI je disclaimer že Aura nie je náhrada za licencovanú starostlivosť.

## Customizácia

- **Meno "Aura"** → nájdi-nahraď v `index.html`, `prompts.js`.
- **Farby** → zmeň CSS premenné `--violet`, `--cyan`, `--pink` v `styles.css`.
- **Jazyk** → prepíš prompty v `prompts.js`. Aura sa automaticky prispôsobuje jazyku používateľa.
- **Model** → zmeň `MODEL` v `script.js` (napr. `gpt-4o` pre silnejšie reakcie).

## Disclaimer

Aura je AI wellness nástroj, **nie** licencovaná psychologická/psychiatrická starostlivosť.
V kríze: 112, Linka dôvery Nezábudka 0800 800 566.
