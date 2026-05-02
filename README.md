# LinkedGuard

Browser extension that automatically flags unsolicited LinkedIn messages — recruiter spam, crypto scams, cold AI/SaaS pitches, MLM, phishing and more — directly in your conversation list. **Privacy-first, 100% local, no servers, no tracking.**

Available for **Firefox** and **Chrome** (Manifest V3).

---

## Features

- **14 built-in keyword lists** covering common LinkedIn spam categories (recruiter outreach, crypto, MLM, marketing agency pitches, SaaS cold emails, phishing, etc.)
- **Visual flagging only** (red sender name + ⚠ badge + red ring on avatar). Auto-archive is planned for a future release.
- **Hover tooltip** shows which list and which keyword triggered the flag.
- **Custom lists** — add your own categories and keywords from the options page.
- **Per-list action override** — disable individual lists or override the global behavior.
- **Activity log** — last 50 flagged conversations with sender, preview, matched keyword and timestamp.
- **Live updates** — toggle protection or change keywords without reloading the LinkedIn tab.
- **Cross-browser** — same codebase, separate manifests for Chrome (`service_worker`) and Firefox (`scripts` event page).
- **Shadow DOM aware** — works with LinkedIn's new `interop-outlet` shadow DOM messaging panel.
- **No external dependencies** — pure vanilla JavaScript, no bundler, no tracking, no telemetry.

## How it works

1. The content script runs on `https://www.linkedin.com/*` (top frame and iframes, including LinkedIn's shadow DOM).
2. A `MutationObserver` watches the conversation list. New conversation cards are scanned for keyword matches in the visible preview text.
3. Each conversation is uniquely identified by its thread ID extracted from `/messaging/thread/<id>/` links — multiple `<a>` tags pointing to the same thread are collapsed to a single card.
4. The first message preview is checked against all enabled keyword lists (case-insensitive by default; word-boundary matching for short keywords like "ia" to avoid false positives).
5. On match, the sender's name is restyled in red, a small ⚠ badge with hover tooltip is appended, and the avatar gets a red outline.
6. Results are cached in `sessionStorage` (per thread ID, invalidated when keyword fingerprint changes) so flags survive React re-renders without re-running the matcher.

## Built-in lists

| ID | Name | Default state |
|---|---|---|
| `recruitment-spam` | Recruitment Spam | enabled |
| `crypto-scam` | Crypto & Financial Scams | enabled |
| `mlm-spam` | MLM / Network Marketing | enabled |
| `generic-spam` | Generic Spam | disabled |
| `ai-prospection` | AI & Prospection Pitches | enabled |
| `agency-pitch` | Marketing Agency Pitches | enabled |
| `seo-spam` | SEO & Backlinks | enabled |
| `coaching-pitch` | Coaching & Mentorship Pitches | enabled |
| `course-sales` | Course & Training Sales | enabled |
| `outsourcing-pitch` | Outsourcing & Offshore Dev | enabled |
| `saas-pitch` | SaaS Cold Outreach | enabled |
| `phishing` | Phishing & Account Threats | enabled |
| `romance-bot` | Romance / Bot Greetings | disabled |
| `investment-pitch` | Investment Opportunities | enabled |

Around 180 keywords in total. Disabled lists are kept in storage so users can opt in without losing their custom changes.

## Installation (development)

```bash
node build.js
```

This produces:
- `dist/chrome/` — Chrome MV3 bundle (`manifest.json` with `service_worker`)
- `dist/firefox/` — Firefox MV3 bundle (`manifest.json` with `scripts` event page + `browser_specific_settings`)

### Chrome / Edge / Brave

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/chrome/` directory.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `dist/firefox/manifest.json`.
3. The extension stays loaded until Firefox is restarted (Mozilla signing is required for permanent install).

## Usage

- **Popup** (toolbar icon) — toggle protection on/off, see archived/flagged stats, enable/disable lists, jump to settings or activity log.
- **Options page** — three tabs: Filter Lists (manage keywords), Settings (global default action, case sensitivity, export/import, reset), Activity Log (last 50 events).
- **On LinkedIn** — open your messaging list (full page `/messaging/` or the floating overlay on `/feed/`). Matched conversations are highlighted automatically.

## Project structure

```
LinkedGuard/
├── manifest.json                 # Chrome MV3
├── manifest.firefox.json         # Firefox MV3 overrides (browser_specific_settings + scripts)
├── build.js                      # Generates dist/chrome/ and dist/firefox/
├── src/
│   ├── background/
│   │   └── service-worker.js     # First-install seeding + LOG_ACTION handler + badge counter
│   ├── content/
│   │   ├── content.js            # Entry point — loads config, starts observers, listens to storage changes
│   │   ├── observer.js           # MutationObserver — debounced scan of the conversation list (incl. shadow roots)
│   │   ├── detector.js           # DOM querying, thread-ID dedup, keyword matching
│   │   ├── flagger.js            # Visual flagging (sender name + avatar outline + tooltip badge)
│   │   ├── archiver.js           # (Planned) auto-archive via DOM interaction
│   │   ├── dispatcher.js         # Routes a match to flag (always, while archive is "coming soon")
│   │   ├── thread-scanner.js     # Scans the open conversation panel — full message text, not just preview
│   │   └── cache.js              # sessionStorage cache keyed by thread ID + keyword fingerprint
│   ├── popup/                    # Toolbar popup (HTML/CSS/JS)
│   ├── options/                  # Full options page with 3 tabs
│   └── shared/
│       ├── constants.js          # browserAPI shim, storage key, debounce util
│       ├── keyword-lists.js      # All 14 built-in lists + DEFAULT_CONFIG
│       └── storage.js            # storage.sync with storage.local fallback
└── assets/icons/                 # 16/32/48/128 PNG icons
```

## Permissions

| Permission | Why |
|---|---|
| `storage` | Persist the user's config (enabled lists, custom keywords, activity log). Uses `sync` when available, falls back to `local`. |
| `host_permissions: https://www.linkedin.com/*` | Restrict the content script to LinkedIn only. No other domain is touched. |

No remote calls. No analytics. No fetch to anything outside `linkedin.com`.

## Privacy

- All keyword matching runs locally in your browser.
- No message content ever leaves your device.
- The activity log (last 50 entries) is stored in `chrome.storage.sync`/`storage.local` only.
- LinkedGuard does not read messages outside `https://www.linkedin.com/*`.

## Roadmap

- [ ] **Auto-archive** — currently disabled (UI shows "Archive (soon)"). Will be re-enabled once the LinkedIn DOM mutation pattern is stable across the new shadow-DOM messaging UI.
- [ ] Bulk-archive all currently-flagged conversations.
- [ ] Right-click context menu on a flagged conversation: "Add sender to allow-list".
- [ ] Per-language pre-built lists (FR, ES, DE).
- [ ] Optional regex mode for power users.

## License

MIT.
