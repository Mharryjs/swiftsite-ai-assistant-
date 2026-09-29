# SwiftSite AI Assistant

A single-page, framework-free assistant experience for **SwiftSite** — a web development
studio. Visitors ask about services, pricing, process and contact in **English** or
**Roman Urdu**; the assistant answers from the studio's real configuration only.

Built with **HTML5, CSS3 and vanilla JavaScript**. AI runs on the **Google Gemini API**.
No React, no Next, no Vue, no Tailwind, no Bootstrap, no jQuery, no build step.

---

## 1. Files

```
/index.html      markup, semantic sections, ARIA, deployment secret hook
/style.css       the whole visual system (tokens, core object, layout, responsive)
/script.js       UI controller: rendering, core states, conversation, form, cursor
/ai.js           Gemini service layer: key resolution, system instruction, streaming, errors
/local.js        offline knowledge engine (used only when no key is attached)
/config.js       the ONLY business file the owner edits
/README.md       this document
```

Load order matters: `config.js` → `local.js` → `ai.js` → `script.js` (all `defer`).

---

## 2. Connecting Gemini (do this first)

The assistant needs a key. **Never commit a real key to public source.**

### Option A — deployment secret (recommended)

Have your host inject the secret at deploy/build time so it never lives in the repo:

```html
<!-- index.html, replaced by the platform at deploy time -->
<script>window.SWIFTSITE_ENV = { GEMINI_API_KEY: "%%GEMINI_API_KEY%%" };</script>
```

or server-render a meta tag:

```html
<meta name="swiftsite-gemini-key" content="...">
```

`ai.js` reads, in order: `window.SWIFTSITE_ENV.GEMINI_API_KEY` →
`window.GEMINI_API_KEY` → the meta tag → a key attached in the browser tab.

Platform secret names to create: `GEMINI_API_KEY`.

### Option B — attach a key for the current tab

Open the site, click the **AI · status** chip in the header (or *Connect AI* in the
assistant rail) and paste a key. It is stored in `sessionStorage` only, disappears when
the tab closes, is never printed to the console and never rendered back into the UI.

### Option C — proxy (best for production)

A public page cannot truly hide a key. When you have a backend, point the layer at your
own endpoint and keep the key server-side. In `config.js`:

```js
ai: { endpointBase: 'https://your-server.com/gemini-proxy', ... }
```

Your proxy only needs to forward `POST {endpointBase}/models/{model}:generateContent`
(and `:streamGenerateContent?alt=sse`) to
`https://generativelanguage.googleapis.com/v1beta`, adding the `x-goog-api-key` header.
`ai.js` sends the key via that header — never in a URL — so nothing sensitive is logged.

### If no key is configured — offline mode (chat still works)

`local.js` is a small knowledge engine built on top of `config.js`. With no key attached the
conversation runs through it, so the chat is never dead:

- it understands greetings, services, individual services (WordPress, e-commerce, frontend,
  backend, apps, UI/UX, maintenance), pricing, process, timelines, technologies, discounts,
  contact, starting a project, capability questions and small talk;
- it detects **English / Roman Urdu / Urdu script / mixed** per message and mirrors it, or
  obeys the rail switch;
- it reads prices, contact details and timelines *from config* — so the moment you fill in a
  real `price`, the offline answers quote it too. Empty fields answer "custom quote" or
  "coming soon", never a made-up figure;
- it varies its openings and offers 3 contextual follow-up chips after each reply.

It is **not** presented as Gemini. The header chip, the badge in the conversation head and a
tag on every reply all read **local knowledge**, the banner says *"Offline mode — the chat
still works"*, and if a visitor asks "are you AI?" it tells the truth about which engine is
answering. Attach a key and the same questions go to the model, with the tag switching to
**Gemini**. Turn the fallback off with `ai.allowLocalFallback: false` in `config.js`; adjust
the typing cadence with `ai.localStreamMs`.

---

## 3. Editing the business data

Everything visible and everything the AI is allowed to say comes from `config.js`:

| Key | Controls |
| --- | --- |
| `services[]` | Service rows in section 03 **and** the AI's service knowledge (`title`, `summary`, `detail`, `tags`, `icon`) |
| `pricing[]` | The ledger in section 05 **and** the AI's pricing answers |
| `pricingCurrency` | Shown next to configured prices |
| `contact` | Channels in section 06, the Email / WhatsApp buttons, mailto fallback in the form result |
| `social[]` | Instagram / GitHub cards and footer links |
| `process[]` | Section 04 and the AI's "how it works" answer |
| `suggestions[]` | Clickable starter questions |
| `form.submissionEndpoint` | Where the enquiry POSTs (empty = nothing is sent, and the UI says so) |
| `form.budgets` | Budget select options |
| `workingHours` | Hours row; leave `''` if not real |
| `ai.models` | Tried in order; the layer falls through on "model not found" |
| `copy.*` | UI strings, including error text |

Available `icon` values (hand-drawn marks, no stock icon set):
`code`, `panels`, `frame`, `stack`, `bag`, `grid`, `crosshair`, `pulse`.

### Price policy

Set `price: null` for anything you have not decided. The UI prints **Custom quote** and the
assistant refuses to invent a number — it explains what the quote depends on and asks one
question about requirements. Fill in a real figure only when it is real:

```js
{ id: 'business', name: 'Business Website', price: 'PKR 85,000', ... }
```

### Contact policy

Empty strings render **Coming soon**. Buttons without a real destination become disabled
states with an honest toast instead of dead or fabricated links. Currently configured and
live: Instagram `@swif.site` and GitHub `Mharryjs`.

---

## 4. What the assistant is allowed to do

The system instruction is assembled at request time from `config.js` and enforces:

- answer **only** from the configured services, pricing, contact and process data;
- never invent prices, timelines, clients, reviews, awards, statistics, team members,
  addresses or company history;
- never claim an action happened — no email sent, no WhatsApp message delivered, no call
  booked, no human joining the chat;
- say *“I don't have that information configured yet.”* when it is not configured;
- mirror the visitor's language, including Roman Urdu and mixed
  (`"Website ka price kya hai for a business?"`), and never convert Roman Urdu to Urdu script;
- vary openings — no repeated "Hello!", "Sure!", "Absolutely!", "Ji";
- short answers for short questions (1–2 sentences), 2–4 for services, a little more when
  detail is genuinely needed; plain text, at most a few `-` bullets, no emoji.

Language can also be pinned with the **Auto / English / Roman Urdu** switch in the rail,
which is injected into the request as an instruction.

---

## 5. Interaction reference

| Feature | Behaviour |
| --- | --- |
| Send | `Enter` |
| New line | `Shift + Enter` |
| Focus composer from anywhere | `/` |
| Close modal / menu | `Esc` |
| Copy an answer | per-message **Copy** (appears on hover, always visible on touch) or **Copy last answer** in the rail |
| Clear | **Clear conversation** — aborts an in-flight request and resets the state |
| Retry | **Try again** on a failed turn, resends without duplicating your question |
| Suggested questions | one tap sends the real request to Gemini |
| Streaming | token-by-token reveal; the core pulses as chunks arrive |
| Core states | `idle` · `listening` · `thinking` · `generating` · `ready` · `error` · `off` — reflected on the orb, rail, header chip and status dot |

Error copy is always human, never a raw API dump:

- key rejected → connection panel prompt
- 429 → *"The AI is busy… give it a few seconds"*
- 5xx / network → *"Sorry, I could not connect to the AI right now."*
- model missing → automatic fallback to the next model in `ai.models`

If streaming is blocked by a proxy, the layer retries once without SSE.

---

## 6. The project form

Client-side validation only (name, email, optional phone, project type, budget, message).
On success it says **"Your project details are ready to send."** and shows the composed
enquiry with **Copy details** / **Send via Instagram**.

It never pretends to have submitted anything. If you set `form.submissionEndpoint`, the
form really POSTs JSON (`{ name, email, phone, projectType, budget, message }`) and reports
the true result, including failure.

---

## 7. Design & accessibility notes

- Green-charcoal `#080B09` base, **light green `#A8D5B0`** as the lead accent with
  **champagne gold `#D3B274`** as the warm counterpoint — the core object burns green with a
  gold under-light, primary buttons fill with a green→gold wash, pricing figures stay gold.
- Type pairing: **Instrument Serif** (display) + **Manrope** (body) + **JetBrains Mono**
  (technical labels and numerals).
- The core object is pure CSS 3D: layered radial gradients, a conic energy field, masked
  rings, orbiting motes, floor shadow and pointer parallax. No canvas, no WebGL, no HUD.
- Sections 01–06 each have their own composition — asymmetric hero, sticky rail beside an
  editorial thread (no chat bubbles), a service ledger list, staggered process steps, a
  pricing ledger, split contact.
- Semantic landmarks, `aria-live` conversation log, labelled inputs, visible focus rings,
  skip link, keyboard-operable modal with focus trap.
- `prefers-reduced-motion` disables the cursor, parallax, grain drift and all core motion.
- Custom cursor only on fine pointers; never on touch.
- Breakpoints tuned at 1440 / 1280 / 1024 / 768 / 480 / 375 — mobile gets a re-laid-out
  rail, a stacked ledger and a lighter core rather than a shrunk desktop.

---

## 8. Running locally

Any static server works (the Gemini call is cross-origin and needs no build):

```bash
python3 -m http.server 8080
# or
npx serve .
```

Opening `index.html` directly via `file://` also works for the UI; use a local server if
your browser restricts `fetch` from file origins.

## 9. Security checklist

- [x] No key committed in `config.js`, `ai.js`, `script.js` or `index.html`
- [x] Key sent as `x-goog-api-key` header, never in a query string
- [x] Key never logged, never rendered, never echoed back after entry
- [x] Placeholder detection (`your_api_key`, `%%…%%`, `xxxx`) is ignored as "not configured"
- [x] Tab-scoped fallback key with an explicit *Remove key* action
- [ ] Move `ai.js` behind a server proxy before heavy public traffic (Option C)
