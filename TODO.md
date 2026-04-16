# TODO — Aura

Zoznam vecí na dorobenie. Hotové škrtni cez `- [x]`.

## Kritické (pred reálnou návštevnosťou)

- [ ] **Waitlist email integrácia**
  Teraz sa emaily zahadzujú. Napojiť Formspree (najjednoduchšie, free 50/mes)
  alebo Resend Audiences (3 000 kontaktov zadarmo, reálny mailing list).
  Kód: `script.js:87-93` — nahradiť "Fake submission" za fetch na endpoint.

- [ ] **GDPR: Privacy policy + cookie banner**
  V EU povinné keď zbieraš emaily a používaš localStorage. Treba:
  – stránku `/privacy` s tým čo zbierame a prečo
  – cookie consent banner (napr. Cookiebot free, alebo vlastný jednoduchý)
  – odkaz v footri (teraz smeruje na `#`)

- [ ] **Oživiť footer linky**
  Teraz: O nás / Blog / Kontakt / Kariéra / Podmienky / Ochrana údajov / GDPR /
  Zodpovedná AI — všetky smerujú na `#`. Každá musí mať cieľ (stránka alebo
  odstrániť z menu).

- [ ] **Fake testimonials a štatistiky**
  Martina K. / Peter V. / Zuzana H. sú vymyslení, ani žiadna beta neprebehla.
  Štatistiky v stats stripe (1.1M, 68%, 8-12 týždňov) sú odhady bez zdroja.
  Buď:
  – zohnať reálne citácie (od kamošov, kolegov, z pilot testu)
  – alebo celú sekciu označiť "Ilustratívne ukážky"
  – alebo vyhodiť, kým nebude reálna beta
  Štatistiky podložiť zdrojom (NCZI, Eurostat, WHO) alebo prepísať vágne.
  Inak riskuješ žalobu za klamlivú reklamu.

## SEO & zdieľanie

- [ ] **Open Graph + Twitter card meta tagy**
  Keď niekto pošle link na WhatsApp / Messenger / Discord, teraz sa neukáže
  žiadny preview. Do `<head>` pridať:
  ```
  <meta property="og:title" content="...">
  <meta property="og:description" content="...">
  <meta property="og:image" content="https://simonkalis.github.io/aura-ai-therapist/og.png">
  <meta property="og:url" content="...">
  <meta name="twitter:card" content="summary_large_image">
  ```
  + vytvoriť OG obrázok 1200x630px (napr. vo Figme — logo + tagline).

## UX & obsah

- [ ] **Mobilný hamburger menu**
  Pod 820px sa nav linky len schovajú (`styles.css:157`). Treba pridať
  hamburger ikonu a slide-out menu. Inak na telefóne nemá používateľ
  prístup k Ako to funguje / Metódy / Cenník / FAQ.

- [ ] **Stránky "O nás" a "Kontakt"**
  Každý serióznejší návštevník ich hľadá pred registráciou.
  – O nás: kto za tým stojí, prečo robíš AI terapeuta, misia
  – Kontakt: email, prípadne formulár, fyzická adresa firmy (GDPR povinnosť)

- [ ] **Blog sekcia**
  Pre SEO a dôveru. Stačia 3-5 článkov na štart
  (napr. "Ako AI môže pomôcť duševnej pohode", "Čo je CBT", "Ako si
  vybrať terapeuta"). Môže byť statické MD v repe, alebo Ghost/Notion.

## Produkt (po launchi)

- [ ] **Funkčný AI terapeut — deploy backendu**
  **Model: Claude Haiku 4.5** (rozhodnuté — budget voľba, pomer cena/kvalita).
  Momentálne `server.js` a `prompts.js` majú ešte OpenAI kód — pri tejto úlohe
  treba:
  – nahradiť `openai` SDK za `@anthropic-ai/sdk` (`npm i @anthropic-ai/sdk`)
  – `server.js`: `client.messages.create({ model: "claude-haiku-4-5-20251001", ... })`
    — system prompt ide do `system` parametra (nie ako first message)
    — pre JSON extrakciu použi tool use s `input_schema`, alebo prompt engineering
      ("Vráť IBA JSON…")
  – `.env.example`: `ANTHROPIC_API_KEY=sk-ant-...` namiesto `OPENAI_API_KEY`
  – `SYSTEM_PROMPT.md` + `README.md`: prepísať cenové odhady a príklady
  – Deploy na Vercel / Railway / Fly.io (Vercel najrýchlejšie pre Node)
  – Frontend prepnúť z demo na `/api/chat` (upraviť `script.js`)
  – Rate-limiting per user (nie len per IP) keď bude auth (po úlohe #14)
  Pri tej istej úlohe spraviť aj extrakčný prompt cez Haiku — na extrakciu
  bohato stačí, a mať jedného vendora je čistejšie.

- [ ] **Auth systém**
  Aby používateľ mal profil cez viac zariadení a nie len v localStorage.
  Odporúčam Clerk (najlepší DX) alebo Auth.js (open source).
  Treba: magic link login, JWT, migrovať localStorage profil do DB
  pri prvom prihlásení.

- [ ] **Stripe pre platby**
  Free / Plus 9€ / Pro 19€ tiery v cenníku nikto nevie kúpiť.
  Stripe Checkout + webhook na aktiváciu tieru, cez Customer Portal
  self-service (zrušenie, zmena tieru, faktúry).

- [ ] **Mood tracking UI**
  V Plus tieri sľúbené "Mood tracking & insighty", ale nie je postavené.
  Minimum: denný check-in (1-10 škála + voľný text), graf za týždeň/mesiac,
  prepojenie na Aurinu pamäť.

---

## Nápady na neskôr (voľné pole)

- ...

---

## 📋 Prompt pre nový Claude terminál

Skopíruj celý blok nižšie do nového Claude Code session, doplň **číslo úlohy**
na konci a pošli. Claude si sám načíta TODO.md, existujúce súbory a nič nepokazí.

```text
Pracujem na projekte Aura — futuristická landing page pre AI terapeuta v slovenčine.

━━━ LOKÁCIE ━━━
• Root: /Users/osobne/ai-therapist/
• Live: https://simonkalis.github.io/aura-ai-therapist/
• GitHub: https://github.com/SimonKalis/aura-ai-therapist
• Deploy: GitHub Pages, auto-deploy po `git push` do `main` (~1 min)

━━━ TECH STACK ━━━
• Statická HTML/CSS/JS, ŽIADNY build, ŽIADNY framework, žiadne npm install
• ES moduly kde treba (prompts.js používa `export`, script.js nie)
• Voliteľný Node/Express backend (server.js, prompts.js) pre reálne OpenAI
  volania — ZATIAĽ NENASADENÝ, nespúšťaj ho, netreba

━━━ ŠTRUKTÚRA ━━━
• index.html     — landing (nav, hero, stats, how-it-works, features, methods,
                   pricing, testimonials, FAQ, CTA, footer) + chat UI + modaly
• styles.css     — celý dizajn, animácie, responsive
• script.js      — landing logika, scroll reveal, waitlist modal, demo chat
• prompts.js     — OpenAI prompty (pre budúci server mód)
• server.js      — voliteľný Express backend (ignoruj)
• SYSTEM_PROMPT.md — dokumentácia promptov
• TODO.md        — zoznam úloh, tam je úloha podľa čísla
• .env.example   — šablóna, NIKDY necommituj skutočný .env

━━━ DIZAJN PRAVIDLÁ (neporušiť) ━━━
• Farby: violet #b8a7ff, cyan #7de0ff, pink #ffa6d8, dark bg #05060b
• Typo: Fraunces (serif, nadpisy s italic emphasis), Inter (sans, text)
• Jazyk: slovenčina v celom UI aj obsahu
• BEZ emoji (pokiaľ ich užívateľ sám nepoužije)
• Glassmorphism (backdrop-filter: blur), animované orby, canvas particles
• Zachovaj existujúce animácie — scroll reveal (.reveal → .in),
  stat counters (data-count), hero preview loop, waitlist counter ticker

━━━ GIT WORKFLOW ━━━
• Global git config NIE JE nastavený — vždy použi -c flagy:
  git -c user.email="osobne@users.noreply.github.com" -c user.name="osobne" commit -m "..."
• Pri push mi povieš a ja spustím cez `! git push` (prefix v prompte)
  alebo ti dám PAT token
• Branch: main. Netvor feature branch, rovno commit na main.

━━━ POSTUP PRE KAŽDÚ ÚLOHU ━━━
1. Prečítaj TODO.md a nájdi úlohu podľa môjho čísla.
2. Prečítaj súbory, ktorých sa úloha týka, PREDTÝM ako niečo meníš.
3. Sprav IBA to, čo je v tej úlohe. Nič iné nerefaktoruj, neupravuj,
   "nezlepšuj". Nepridávaj features ktoré si nežiadal.
4. Ak niečo v úlohe nie je jednoznačné, spýtaj sa mňa, nehádaj.
5. Po dokončení:
   a) Zaškrtni úlohu v TODO.md → zmeň `- [ ]` na `- [x]`.
   b) Spusti lokálny test: python3 -m http.server 8000, overr že stránka ide.
   c) Sprav commit s popisom čo si urobil (-c flagy vyššie).
   d) Pošli mi príkaz na push, ktorý spustím ja.
6. Ak si objavil niečo čo by sa malo doplniť do TODO, napíš to mne
   a ja sa rozhodnem či to pridať — sám do TODO.md NIČ nové nepridávaj.

━━━ ÚLOHA NA TERAZ ━━━
Urob mi úlohu číslo: #___
```

Nahraď `#___` za číslo úlohy (napr. `#1` alebo viac `#1, #3`).

