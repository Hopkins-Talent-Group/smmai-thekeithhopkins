# Frontend Fix Plan v2 — SMMAI Marketing Site (dev branch update)

Re-audit of `vitrixLab/social-media-smm-automation` after new commits landed on
`dev`. Comparing the commit `plan.md` (v1) was written against
(`bd0e50d`, "v3.0 CRM fix") to current `dev` HEAD (`6bfd870`, "v3.3"),
confirmed via two independent fetches (`git clone` + a direct
`raw.githubusercontent.com` pull, byte-identical).

**Good news first:** a real pass was made at the v1 list — 8 of the 16 P0/P1
items are properly fixed, including the two hardest ones (the invisible-input
contrast fix and the hardcoded-login cleanup). See **"Fixed correctly"** below.

**The reason this needs a v2 and not just a changelog entry:** the fix pass
introduced three new bugs that are more severe than anything in the original
audit — including one that currently breaks the visual styling of the entire
site. These are verified, not suspected — see the evidence under each item.

This file only covers what changed. For anything not mentioned here, the
original `plan.md` (v1) still applies as written.

---

## P0 — New critical regressions (fix before anything else)

### 1. One missing `}` currently discards ~95% of the site's CSS
**Where:** `index.html`, the new `.sr-only` rule starting at line 118.

```css
.skip-link:focus { top: .75rem }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
                                      /* <-- no closing brace here */
/* ─── Layout ─────────────────────────────────────────────────────────────── */
.wrap { max-width: 1120px; margin: auto; padding: 0 24px }
```

The `.sr-only` rule (added to support the new screen-reader-only hero stats,
see "Fixed correctly" below) never closes. I verified the actual blast radius
with a spec-compliant CSS parser (`tinycss2`) rather than guessing:

| | Rules parsed |
|---|---|
| **Current file (bug present)** | 13 top-level rules total. Rule #12 (`.sr-only`) alone swallows **22,283 characters** — everything from itself to the literal end of the `<style>` block. |
| **Same file with the `}` added back** | 166 qualified rules + 10 media-query blocks — the full, correct stylesheet. |

In plain terms: because CSS error recovery treats every subsequent
`selector { ... }` block as garbage content *inside* the still-open
`.sr-only` declaration, **every rule after line 118 is silently dropped** —
`.wrap`, `nav`, `.btn`, the entire hero, every card, every grid, every media
query. A browser loading this page today gets unstyled, default black-on-white
HTML: no fixed nav, no layout, no colors, no cards. This is not a visual nit,
it's the whole design.
- [ ] Add the missing `}` after `border: 0;` (before the `/* ─── Layout ─── */` comment).
- [ ] After fixing, actually load the page in a browser (or re-run a CSS parse) before merging — this class of bug is invisible in a code review that only reads the diff, since the diff itself looked like a reasonable, small addition.

### 2. `login.html`'s new theme toggle uses JSX syntax in a plain HTML file — it's not a browser feature, so it doesn't run
**Where:** `login.html` lines 181–196 and 211–214.

```html
<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
    <button
        className="theme-toggle"
        aria-label="Toggle light/dark theme"
        title="Toggle theme"
        onClick={() => {
            const html = document.documentElement;
            ...
        }}
    >
```
`className`, `onClick={...}`, and `style={{...}}` are React/JSX conventions —
this is a static `.html` file with no build step, so none of them mean
anything to a browser:
- `className="theme-toggle"` is not `class="theme-toggle"` — the browser doesn't apply the `.theme-toggle` CSS rule, so the button renders unstyled.
- `style={{ display: "flex", ... }}` is not valid CSS text (curly-brace object, comma-separated, camelCase property names) — none of it applies; the wrapper div gets no flex layout.
- `onClick={() => {...}}` isn't quoted and contains raw `(`, `)`, `{`, `"` characters — HTML attribute parsing will not interpret this as a click handler at all.

The real, working handler is the vanilla `<script>` block further down
(lines 220–236), which does:
```js
var btn = document.querySelector('.theme-toggle');
var icon = btn.querySelector('.theme-icon');   // <-- throws here
```
Because no element actually has `class="theme-toggle"` (only the invalid
`className`), `document.querySelector('.theme-toggle')` returns `null`, and
the very next line throws `TypeError: Cannot read properties of null`. This
is an uncaught error on every load of `login.html` — the theme toggle is
completely inert, and the intended fix for v1's "theme doesn't sync between
pages" issue does not actually take effect because of it.
- [ ] Rewrite the block as plain HTML: `class="theme-toggle"`, a real `style="display:flex;justify-content:flex-end;margin-bottom:1.5rem"` string (or a CSS class), and no `onClick` attribute — let the existing `<script>` block at the bottom attach the listener, the way `index.html`'s nav toggle already correctly does it.

### 3. `login.html`'s "Sign in" button no longer does anything meaningful
**Where:** `login.html` — compare old vs. new `<script>` block.

The v1 fix correctly removed the *dead* orphaned script from `index.html`
(good), but the cleanup of `login.html` went further and deleted the **only**
script that handled this page's own form submission — there is now no
`loginForm.addEventListener('submit', ...)` anywhere in the file. The
`<form id="loginForm" novalidate>` has no `action` or `method` attribute, so
clicking "Sign in" now falls through to the browser's default behavior:
a GET submission to the current URL with the email and password appended as
a query string (e.g. `login.html?email=...&password=...`), reloading the
page with nothing accomplished — and briefly putting the typed password in
the URL bar/history in the process.
- [ ] At minimum, restore a submit handler (ideally without the hardcoded-credentials-in-the-error-message pattern flagged in v1 P1-10) so the demo does something. If the intent was genuinely to disable this form until real auth exists, disable the button and say so in the UI rather than leaving default browser behavior to take over silently.

---

## P1 — New bugs introduced by the fix pass

### 4. Hamburger icon always displays as an "X," never as three bars
**Where:** `index.html` lines 169–170.

```css
.hamburger span:nth-child(1) { transform: translateY(6px) rotate(45deg) }
.hamburger span:nth-child(3) { transform: translateY(-6px) rotate(-45deg) }
```
These are the "closed → X" transforms, but they're applied unconditionally —
not scoped under `.open` or `[aria-expanded="true"]`. The three bars form an
X at all times, so the menu button never actually looks like a hamburger; it
looks like a permanently-active close button, which is confusing before the
first tap.
- [ ] Gate these two rules behind `.hamburger.open span:nth-child(1)` / `:nth-child(3)` (and toggle an `.open` class on the button itself in the existing click handler, alongside the class you already toggle on `.nav-links`).

### 5. Hamburger button's `tabindex="1"` jumps ahead of the skip link
**Where:** `index.html` line 1125.

```html
<button class="hamburger" aria-label="Open navigation" tabindex="1">
```
Positive `tabindex` values are visited before any `tabindex="0"`/default-order
element, regardless of DOM position. At the ≤400px width where this button is
actually visible, a keyboard user's very first Tab press now lands here —
ahead of the skip link that v1 fixed. This re-introduces a version of the
same problem on exactly the viewport where the skip link matters.
- [ ] Remove `tabindex="1"` entirely (a `<button>` is natively focusable in correct DOM order without it).
- [ ] Add `aria-expanded="false"` to the button in the markup itself — right now it only gets an `aria-expanded` value after the first click (set at line 1691), so a screen-reader user encounters an unlabeled toggle state on first contact.

### 6. `all: initial` on the mobile nav wipes inherited font, color, and spacing
**Where:** `index.html` line 173 (`.nav-links { all: initial; position: relative; }`) and line 1108 (`.nav-links .link.active { all: initial }`).

`all: initial` resets *every* property — including inherited ones like
`font-family` and `color` — to the CSS specification's initial value, not to
"whatever the parent/site normally uses." Concretely: at ≤400px, text inside
the open mobile menu will fall back to the browser's default serif font
(since `font-family` no longer inherits "Plus Jakarta Sans" through this
node), and the hardcoded "active" link ("How it works") loses its padding,
font-size, and green highlight along with the properties `all: initial` was
presumably meant to reset. The later, more complete `@media (max-width: 400px)`
block (now at line 1104) re-declares `display`, `position`, and a few others,
but only those — everything else stays at `initial`.
- [ ] Replace both `all: initial` uses with the specific two or three properties actually intended to reset (most likely just `background`/`color` for the active-link override). `all: initial`/`all: unset` are almost never the right tool inside a component that has children relying on inherited styling.

### 7. New login-input focus outline is immediately cancelled by an old rule three lines later
**Where:** `login.html` lines 126–133.

```css
.form-group input:focus { outline: 2px solid var(--primary); outline-offset: 4px }  /* line 131, new */

.form-group input:focus { outline: none; border-color: var(--primary) }             /* line 133, pre-existing, untouched */
```
Same selector, declared twice. Same specificity, so the one that comes later
in the file wins for any property both declare — `outline: none` (from the
untouched old rule) beats `outline: 2px solid var(--primary)` (from the new
one). Net effect: the border-color-only focus state from before the fix is
still what actually renders; the intended, more visible focus ring never
shows up.
- [ ] Delete the old rule at line 133 (or merge the two into one declaration) so the new outline actually takes effect.

### 8. "Forgot password?" / "Create free account" went from dead links to invisible, unstyled text
**Where:** `login.html` lines 211–214.

```html
<span style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
    <span style={{color: "var(--muted)", textDecoration: "none"}}>Forgot password?</span>
    <span style={{color: "var(--muted)", textDecoration: "none"}}>Create free account</span>
</span>
```
Same `style={{...}}` JSX problem as item 2 — none of this styling applies.
Beyond that, these were downgraded from `<a>` elements (clickable, if you
had nowhere to go) to plain `<span>`s with no click target and no gap between
them (the intended `gap: "0.5rem"` never applies, and `<span>` is inline by
default), so the two labels will likely render pressed up against each other
with no visual separation and no indication that they were ever meant to be
actionable.
- [ ] If these are staying non-functional for now, style them as plain, visually-separated text with real CSS (not JSX) rather than leaving invalid markup in place. If they're meant to eventually work, that's a bigger product decision — flag it rather than shipping either broken state.

---

## Fixed correctly (no action needed — confirmed by diff)

These v1 items are properly resolved on `dev` now:

- **P0-5** — All 10 `tabindex="0" role="article"` dead keyboard stops removed from `index.html`'s cards, *and* mirrored into the Next.js `ArchCard.tsx` component (`nextjs-setup/nextjs-dashboard/src/components/ui/ArchCard.tsx`).
- **P0-6** — Duplicate/broken second skip link removed from `index.html`.
- **P0-1 (partial)** — `<noscript>` fallback added to force `[data-reveal]` visible when JS doesn't run. (This CSS is currently a casualty of item 1 above along with everything else — once the brace is fixed, this fix is sound.)
- **P1-9** — The dead orphaned login script in `index.html` (`loginBtn`/`loginSection`/etc., referencing elements that never existed on that page) is gone, replaced with the real hamburger-menu script.
- **P1-12** — The phase-badge no longer wraps a full sentence clause; it's plain text now.
- **P1-13** — Hero dashboard's trust stats ("28 posts this week," "100% human-reviewed," "0 bypassed gate") are now exposed to screen readers via a `.sr-only` paragraph. Correct content, correct approach — just currently unstyled/inert due to item 1.
- **P1-14** — GitHub link is now in the nav (`.github-badge`, previously dead CSS, is now wired up in the markup) — no longer buried at the very bottom of the page.
- **P0-3 (login.html)** — Input border color changed from `var(--line)` to `var(--muted)`; contrast against the input background is now ~4.8:1, comfortably clearing the 3:1 non-text-contrast minimum (was ~1.19:1).
- **P0-4 (login.html)** — Skip link now has real `.skip-link` CSS and an actual `#main-content` target (a new `<main>` wraps the form).
- **P1-7 (login.html)** — Page now has a header with a logo linking back to `index.html`, and the heading was promoted from `<h2>` to `<h1>`.
- **P1-8 (login.html)** — Button text color changed from hardcoded `white` to `var(--bg)`, matching `index.html`'s pattern; contrast is now ~5.2:1 (was ~3.77:1, failing).

---

## Still open from v1 (untouched — see `plan.md` for full detail)

- Security-grid card titles are still `<div class="title">` instead of `<h3>` (v1 P1-11) — screen-reader heading navigation still skips these four cards.
- No `autocomplete="email"` / `autocomplete="current-password"` on the login inputs (v1 P2).
- No password show/hide toggle (v1 P2).
- Nav `.active` state is still hardcoded to "How it works," no scroll-spy (v1 P2).
- `scroll-behavior: smooth` still isn't reduced-motion gated (v1 P2).
- Blue `--secondary`/`#60a5fa` accent still present despite `DESIGN.md`'s "not blue-midnight" rule (v1 P2).
- Touch target sizing at the smallest breakpoints still unverified (v1 P2).
- Orphaned `style.css`, stray root files, tripled HTML comments — all still present (v1 P3).
- The open question about `index.html`/`login.html` vs. the Next.js app is still unresolved — and worth resolving soon, since this update shows active work continuing on *both* fronts in parallel (the Next.js `CRMDashboard.tsx` and `ContentDraftCard.tsx` also changed in this same update).

---

## Suggested sequencing

1. **Right now:** item 1 (the missing brace). One character, and it's the difference between "styled site" and "unstyled site" — this should be the very next commit.
2. **This sprint:** items 2 and 3 (login.html JSX cleanup + restoring a working submit handler) — same file, do them together.
3. **Next:** items 4–8, all small, independent, mostly one-line fixes.
4. **Ongoing:** the v1 backlog above, unchanged from before.
