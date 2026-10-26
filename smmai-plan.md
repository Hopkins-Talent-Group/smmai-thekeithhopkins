# Frontend Fix Plan — SMMAI Marketing Site

Audit of `vitrixLab/social-media-smm-automation` (`dev` branch). Scope is the
**deployed static site** — `index.html`, `login.html`, `style.css` at the repo
root (confirmed as the Vercel deploy target via `vercel.json`,
`"outputDirectory": "."`). The `nextjs-setup/nextjs-dashboard` scaffold and
`dashboard-skill/` are a separate, not-yet-live app and are out of scope here —
see **Open Question** at the bottom.

Every item below was verified directly against the source (line numbers refer
to the file as of the audited commit on `dev`) — nothing here is generic
boilerplate advice.

## How to use this file

Work top to bottom. P0 items are things that actively break access to content
or navigation for a real slice of users — fix these first. Each item has a
checkbox; check it off as you land the fix. File/line refs point at the
current bug, not necessarily where the fix goes.

---

## Severity key

| Level | Meaning |
|---|---|
| **P0** | Breaks access to content or navigation for real users. Fix this sprint. |
| **P1** | Confirmed bug or a11y failure that degrades the experience or credibility. Fix soon. |
| **P2** | Inconsistency or missed best practice. Worth a pass. |
| **P3** | Hygiene / dead code / repo cleanliness. Batch these together. |

---

## P0 — Critical

### 1. Page content is fully JS-dependent with zero fallback
**Where:** `index.html` lines 255–269 (`[data-reveal]` CSS) + lines 1596–1633 (reveal `IntersectionObserver` script).

Almost every content block on the page — hero copy, all three story pairs, all
6 architecture cards, all 4 security cards, the roadmap, the closing CTA —
carries `data-reveal`, which sets `opacity: 0; transform: translateY(28px)`.
The **only** thing that ever removes that (outside of `prefers-reduced-motion`)
is the `IntersectionObserver` script running successfully. If JavaScript is
blocked, disabled, throws before this block runs, or the browser lacks
`IntersectionObserver` support, **the entire page renders blank below the nav**
— not degraded, invisible. There is no `<noscript>` fallback and no CSS-only
floor state.
- [ ] Add a `<noscript>` block that force-overrides `[data-reveal]` to `opacity:1; transform:none`, matching the existing reduced-motion fallback.
- [ ] Better: default `[data-reveal]` to visible and have JS *add* the hidden starting state right before animating, so a slow/failed script degrades to "just visible," not "just invisible."

### 2. Nav becomes unusable on the most common phone width
**Where:** `index.html` lines 1071–1074 and 1085–1091.

```css
@media (max-width: 400px) {
  .nav-links .link:not(.active) { display: none } /* line 1072 */
}
```
`.active` is hardcoded on "How it works" in the markup (line 1086) — there's
no scroll-spy JS updating it. So under 400px CSS width, **every nav link
disappears except "How it works"**: Architecture, Security, Roadmap, and
**Login** all become unreachable. There is no hamburger menu anywhere in the
codebase (confirmed — no `menu-toggle`/`hamburger`/`aria-expanded` exists).
400px is not an edge case: standard iPhone 12–16 (non-Plus/Pro Max) is 390px
wide, and most Android phones sit in the 360–400px range. This means a large
share of mobile visitors on the most common phones cannot reach the Login
page, or three of the four content sections, from the nav at all.
- [ ] Replace the "hide links" pattern with a real mobile menu (hamburger + `aria-expanded` toggle, or a `<select>`-style nav) that keeps every destination reachable at every width.
- [ ] Fix `Login` specifically first if the menu rebuild takes longer — it's the one link users can't route around.

### 3. `login.html` form fields are effectively invisible
**Where:** `login.html` lines 109–113.

```css
.form-group input {
  border: 1px solid var(--line); /* #162618 */
  background: var(--surface);    /* #0b1310 */
}
```
Computed contrast of the input border against its own background: **1.19:1**.
WCAG 1.4.11 (Non-text Contrast) requires **3:1** for required UI component
boundaries. In practice the input has no visible edge — on the dark panel it
reads as bare, floating placeholder text with no field around it at all.
- [ ] Give inputs a border that hits ≥3:1 against `--surface` in both themes (e.g. `var(--muted)` or a dedicated `--input-border` token), or add a visible background shift + `box-shadow` ring on `:focus` at minimum.

### 4. `login.html` skip link is broken
**Where:** `login.html` line 150.

```html
<a class="skip-link" href="#main-content">Skip to main content</a>
```
Two problems: `login.html`'s `<style>` block (lines 19–145) never defines
`.skip-link` at all, so this renders as an unstyled, permanently-visible
inline link at the very top of the page — not the intended hidden-until-focused
pattern. And there is no element with `id="main-content"` anywhere in the file,
so even a sighted click does nothing. This directly violates the project's own
`DESIGN.md` constraint **R-32** ("skip link present for keyboard users").
- [ ] Wrap the login card in `<main id="main-content">` and reuse the working `.skip-link` CSS from `index.html`.

### 5. Ten non-interactive cards are keyboard tab stops that do nothing
**Where:** `index.html` lines 1341, 1353, 1365, 1377, 1389, 1401 (arch-grid) and 1424, 1431, 1438, 1445 (security-grid).

```html
<article class="card" tabindex="0" role="article" aria-label="Layer 01 — AI provider">
```
All 10 cards are `tabindex="0"` with a visible `:focus-visible` state, but none
of them are links, buttons, or do anything on Enter/Space — they're static
content. A keyboard or screen-reader user must tab through 10 dead stops
(announced as "article, Layer 01 — AI provider" etc.) to get from the roadmap
above them to the CTA button below. This is the classic "focusable but not
actionable" anti-pattern flagged by every automated a11y auditor (axe, WAVE).
- [ ] Remove `tabindex="0"` (and the now-pointless `role="article"` — `<article>` already has that implicit role) unless these cards are meant to be clickable, in which case wrap them in real `<a>`/`<button>` elements with an actual destination.

### 6. Duplicate skip link doesn't skip anything
**Where:** `index.html` line 1079 vs. line 1100.

There are two identical `<a class="skip-link" href="#main-content">Skip to
main content</a>` elements. The first one (line 1079, before `<header>`) works
correctly. The second (line 1100, commented `<!-- Skip link for mobile navbar -->`)
sits **after** the nav closes, so by the time a keyboard user reaches it
they've already tabbed through the entire nav it claims to let them skip. It
provides zero benefit and, worse, a screen-reader user browsing by links will
hear "Skip to main content" announced twice.
- [ ] Delete the second skip link (line 1100) entirely.

---

## P1 — High

### 7. Login page is a dead end
**Where:** `login.html`, whole file.

No `<header>`, `<nav>`, or `<main>` landmark; heading structure starts at
`<h2>` (line 154) with no `<h1>` on the page at all; and there is no logo,
brand link, or way back to the marketing site short of the browser back
button. A visitor who lands here directly (bookmark, shared link) is stuck.
- [ ] Add a minimal header with the logo linking to `index.html`, and promote the card heading to `<h1>`.

### 8. Login button text fails contrast
**Where:** `login.html` lines 117–124.

```css
.btn { background: var(--primary); color: white; font-size: var(--text-md); font-weight: var(--weight-bold); }
```
White (`#ffffff`) on `--primary` (`#059669`) is **3.77:1**. The button text is
18px bold, just under WCAG's 18.66px-bold threshold for "large text," so the
required minimum is 4.5:1, not 3:1 — this fails AA. Notably `index.html`'s own
`.btn.primary` avoids this by using `color: var(--bg)` (dark text) instead,
which measures **5.23:1** — the login page just didn't reuse that token.
- [ ] Change `color: white` to `color: var(--bg)` to match `index.html` and restore AA contrast.

### 9. Two conflicting, half-built login flows
**Where:** `index.html` lines 1636–1681 (dead script) vs. line 1090 (real link) vs. `login.html`.

The nav's "Login" link (line 1090) correctly navigates to `login.html`. But
`index.html` also ships ~45 lines of script (1636–1681) wired to
`loginBtn` / `#login` / `loginForm` / `loginEmail` / `loginPassword` —
**none of which exist anywhere in `index.html`'s markup**. The guard clause
(`if (!loginBtn || ...) return;`) makes this silently inert, but it's dead
code left over from an earlier "inline toggle" login design that was replaced
by the separate page and never removed. `window.location.hash = '#dashboard'`
inside it references a section that also doesn't exist. This is the kind of
orphaned logic that causes real regressions the next time someone edits nearby
code assuming it does something.
- [ ] Delete the entire block (lines 1636–1681 in the last `<script>` tag).

### 10. Hardcoded demo credentials surfaced in a blocking `alert()`
**Where:** `login.html` lines 186–198.

```js
if (email.trim() === 'admin@smmai.com' && password.trim() === 'admin') {
  window.location.href = 'index.html#workflow';
} else {
  alert('Invalid credentials. Use: admin / admin');
}
```
Even for a demo, telling every visitor the working credentials in the error
message trains them to ignore any real auth later, and native `alert()` is a
jarring, unstyled, blocking UX pattern. It also fires on an **empty** submit
(the form has `novalidate` with no custom validation), so a blank submit gets
the same "Invalid credentials" message as a wrong one — confusing.
- [ ] If this needs to stay a demo, say so in the UI copy instead of the error message ("Demo mode — any input signs you in" or similar), and add real `required`/inline validation feedback instead of relying on a blocked native `alert()`.
- [ ] Redirecting to `index.html#workflow` on "login" is also a mismatch — that anchor is the marketing "How it works" section, not a dashboard. Point it at wherever the logged-in experience actually should live once that exists.

### 11. Security-grid card titles are invisible to screen-reader heading navigation
**Where:** `index.html` lines 1427, 1434, 1441, 1448 vs. 1346, 1358, 1370, 1382, 1394, 1406.

The architecture cards directly above correctly use `<h3 class="title">`.
The security cards one section down use the identical visual class on a plain
`<div>`:
```html
<div class="title">Dry-run first</div>   <!-- line 1427, should be <h3> -->
```
Visually identical, semantically invisible. A screen-reader user jumping by
heading (a very common navigation pattern — NVDA "H", VoiceOver rotor) will
see all 6 architecture layers but none of the 4 security guarantees.
- [ ] Change all four to `<h3 class="title">` to match the pattern used two sections earlier.

### 12. Badge component misused to wrap a full sentence clause
**Where:** `index.html` line 1449.

```html
<p class="desc">The publishing service requires a human approval signal
  <span class="phase-badge completed">before a live publish can proceed</span>.
</p>
```
`.phase-badge` (lines 896–921) is styled for short pill labels — uppercase,
tracked letter-spacing, a leading dot, inline-flex — and is used correctly
everywhere else for single words/short phrases ("Completed", "In progress").
Here it wraps a 7-word clause, which will render as an oversized, oddly
wrapping, all-caps pill in the middle of a sentence.
- [ ] Remove the badge markup here and let it read as plain sentence text, or rewrite the sentence so the badge only wraps a short label.

### 13. Hero dashboard mockup hides its own key stats from screen-reader users
**Where:** `index.html` lines 1120 and 1167–1180.

```html
<div class="hero-visual" id="heroVisual" aria-hidden="true" ...>
  ...
  <div class="dash-footer">
    <div class="dash-stat"><strong>28</strong> posts this week</div>
    <div class="dash-stat"><strong>100%</strong> human-reviewed</div>
    <div class="dash-stat"><strong>0</strong> bypassed gate</div>
  </div>
```
Hiding the whole decorative mockup from assistive tech is the right call in
general, but the footer stats — "0 bypassed gate," "100% human-reviewed" —
are trust-building numbers that don't appear anywhere in the surrounding
paragraph text. Blind users currently get none of them.
- [ ] Add a visually-hidden `<p>` near the hero (standard `.sr-only` pattern) that states the same three stats in plain text, so the content parity matches what sighted users see.

### 14. GitHub link — the primary call-to-action for an OSS project — is buried at the very bottom
**Where:** `index.html` line 1497 (only occurrence) vs. nav at lines 1085–1091.

The single link to the actual repository is the last thing on the page, after
a full scroll through hero → workflow → highlights → architecture → security →
roadmap. The nav has no GitHub entry at all. Worth noting: a fully-styled,
unused `.github-badge` class already exists (lines 235–250, hover/focus states
included) and is never referenced in any markup — strongly suggesting a
nav-bar GitHub badge was planned and dropped mid-build.
- [ ] Wire up `.github-badge` in the nav (it's already styled and ready) so the repo link is reachable without scrolling.

### 15. `login.html` never applies the saved theme — always renders dark
**Where:** `login.html`, whole file (no theme script present) vs. `index.html` lines 1514–1528.

`index.html` reads `localStorage.getItem('smma-theme')` and applies `html.light`
accordingly. `login.html` defines the same `html.light` CSS variables (lines
66–76) but has no script to read that value or a toggle button to change it.
A user who switches to light mode on the homepage and clicks "Login" gets
dropped back into dark mode with no way to switch back. This also means the
project's `DESIGN.md` claim (**R-21**: "both modes WCAG verified") hasn't
actually been checked on this page, since light mode is unreachable here.
- [ ] Copy the theme-toggle button and its script from `index.html` onto `login.html`.

### 16. "Forgot password?" and "Create free account" are dead links
**Where:** `login.html` lines 169 and 173.

Both are `href="#"` with no handler — they visually look actionable (styled as
a button and an underlined link respectively) but do nothing except jump to
the top of the page.
- [ ] Either implement the destinations or remove the elements until they exist — a styled dead link erodes trust faster than not offering the option at all.

---

## P2 — Medium

- [ ] **Theme toggle doesn't announce its state.** `index.html` line 1092: `aria-label="Toggle light/dark theme"` is static regardless of current mode. Add `aria-pressed` (true when light is active) so assistive tech can tell which state is active, not just that a toggle exists.
- [ ] **`scroll-behavior: smooth` isn't reduced-motion-gated.** `index.html` line 86. Every other animation in this file (float, tilt, glow, reveal) is carefully wrapped in `prefers-reduced-motion` checks — this one line was missed. Add `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }`.
- [ ] **External GitHub link opens a new tab with no warning.** `index.html` line 1497, `target="_blank"`. Add visually-hidden text ("opens in a new tab") for screen-reader users, per WCAG 3.2.5 good practice.
- [ ] **Architecture "flow" labels have no dedicated styling.** `index.html` lines 1348, 1360, 1372, 1384, 1396, 1408 (`<span class="cta">...→</span>`). No `.cta` CSS rule exists for this class (confirmed — only `.cta-band` matches), so these connector labels ("Hands drafts to Moderation →") inherit plain body text styling and likely blend into the description paragraph above them instead of reading as a distinct visual connector between layers.
- [ ] **No favicon, no Open Graph / Twitter Card meta tags, no `theme-color`.** Neither `index.html` nor `login.html` defines any of these. For a social-media product, a shared link with no preview image/title card is a conspicuous miss. Add `og:title`, `og:description`, `og:image`, `twitter:card`, a favicon link, and `theme-color`.
- [ ] **Blue accent breaks the stated all-green palette.** `DESIGN.md` explicitly states "Not blue-midnight" as a brand rule, yet `--secondary: #2563eb` and the literal `#60a5fa` appear as the "in progress / WIP" state color (`index.html` lines 733, 742, 918–919). Either bring this into the emerald/amber palette or update `DESIGN.md` to document blue as an intentional third status color.
- [ ] **Verify touch target sizes at the smallest breakpoints.** At `max-width: 540px` (`index.html` line 1064), nav `.link` padding shrinks to `.35rem .5rem` at 12px font — check this and the theme-toggle button (line 179–190) against the WCAG 2.2 AA 24×24px minimum target size, and ideally 44×44px for comfortable mobile tapping.
- [ ] **Login form fields are missing `autocomplete`.** `login.html` lines 159, 164. Add `autocomplete="email"` and `autocomplete="current-password"` so password managers and browser autofill work correctly.
- [ ] **No show/hide password toggle** on `login.html`'s password field (line 164) — minor, but standard on modern login forms.
- [ ] **No active nav-link scroll-spy.** `index.html` line 1086 hardcodes `.active` on "How it works" regardless of actual scroll position; it never updates as the user scrolls through the other sections. Low priority relative to the mobile-nav fix in P0-2, but worth doing in the same pass since you'll be touching this markup anyway.

---

## P3 — Hygiene / cleanup

- [ ] **Delete the orphaned `style.css`.** Root-level `style.css` (44 lines) is not linked from either HTML file (confirmed via grep) — it's dead code from an earlier iteration, and it also contains a broken rule (`h1 { font-size: clamp(44px--80px); }`, line 21 — invalid `clamp()` syntax) that would never have worked even if it were wired up.
- [ ] **Remove or use `.github-badge`.** `index.html` lines 235–250 — fully styled, zero markup usage. (See P1-14: the fix is to use it, not delete it — listed here only if the nav-badge idea is scrapped instead.)
- [ ] **Clean up tripled/duplicated section comments.** `index.html` lines 1329–1331 (`<!-- ── Architecture ── -->` × 3) and 1414–1415 (`<!-- ── Security ── -->` × 2) — harmless but clearly copy-paste artifacts.
- [ ] **Remove stray root files.** `New Text Document.txt` (empty) and `links.md` (a single unrelated Facebook share URL, unused anywhere in the site) add noise to the repo root.
- [ ] **Redundant ARIA on `<article>` elements.** `role="article"` on all 10 `.card` elements (see P0-5 refs) is redundant — `<article>` carries that role implicitly. Drop it regardless of how P0-5 is resolved.

---

## Suggested sequencing

1. **This sprint (P0):** items 1–6. These are the ones actively hiding content or navigation from real visitors.
2. **Next (P1):** items 7–16, ideally the whole `login.html` cluster (7, 8, 9, 10, 15, 16) together in one pass since they touch the same file.
3. **Then (P2):** batch these into one PR — mostly small, independent CSS/markup tweaks.
4. **Anytime (P3):** a single cleanup PR, good first-timer-friendly if this is open to outside contributors.

---

## Open question worth resolving before investing further here

`AGENTS.md` shows a parallel, more capable Next.js app already scaffolded at
`nextjs-setup/nextjs-dashboard/`, including its own login page and a "CRM and
automation command center" dashboard — with the *same* demo credentials
(`admin@smmai.com` / `admin`) as the static `login.html` audited here. Worth
confirming: is `index.html` / `login.html` the long-term public site, or a
placeholder ahead of the Next.js app replacing it? If the latter, some of the
P1/P2 work above (especially the login-flow items) may be better spent
directly in the Next.js app instead of polishing a page that's about to be
replaced. Happy to run the same audit against `nextjs-setup/nextjs-dashboard`
if that's the more useful target.
