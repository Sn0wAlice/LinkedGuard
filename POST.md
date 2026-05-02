# LinkedGuard - Store submission copy

Copy/paste blocks for filling out the Firefox AMO and Chrome Web Store submission forms.

---

## Name

```
LinkedGuard
```

## Slug / Add-on URL

```
linkedguard
```

## Summary (short description, max 250 chars on AMO)

```
Automatically flags unsolicited LinkedIn messages - recruiter spam, crypto scams, cold pitches, MLM, phishing - directly in your conversation list. 100% local, no tracking.
```

(170 chars - fits AMO's 250 limit and Chrome's 132 short description if trimmed.)

### Chrome Web Store short description (132-char version)

```
Flag recruiter spam, crypto scams, cold pitches and phishing in your LinkedIn inbox. 100% local, no tracking.
```

---

## Long description (Markdown supported on AMO)

```markdown
**LinkedGuard** highlights unsolicited messages in your LinkedIn inbox so you can ignore them at a glance - no more wasted time on recruiter copy-paste, crypto scams, MLM pitches, or "quick 15-min call" cold outreach.

### What it does

When someone sends you a first message containing words from any enabled category, LinkedGuard:

- Highlights the sender's name in red, directly in your conversation list
- Adds a small ⚠ badge with a tooltip showing **which list** and **which keyword** triggered the flag
- Outlines the sender's avatar in red

That's it. Nothing is archived, nothing is deleted, no message is rewritten. You stay in control.

### 14 built-in categories

- Recruitment Spam
- Crypto & Financial Scams
- MLM / Network Marketing
- AI & Prospection Pitches
- Marketing Agency Pitches
- SEO & Backlinks
- Coaching & Mentorship Pitches
- Course & Training Sales
- Outsourcing & Offshore Dev
- SaaS Cold Outreach
- Phishing & Account Threats
- Investment Opportunities
- Generic Spam *(disabled by default)*
- Romance / Bot Greetings *(disabled by default)*

Around 180 keywords ship by default. You can toggle any list, edit its keywords, or create your own custom lists from the options page.

### Privacy

LinkedGuard runs **entirely in your browser**. Nothing ever leaves your device:

- No analytics, no telemetry, no remote logging
- No fetch to any server outside `linkedin.com`
- Settings are stored only in your browser's local storage (with optional Firefox Sync)
- Activity log keeps the last 50 events, locally only

### Permissions explained

- **`storage`** - saves your enabled lists, custom keywords and activity log locally
- **`https://www.linkedin.com/*`** - the only site this extension is allowed to read or modify

### Open source

Source code, full keyword lists and changelog: https://github.com/Sn0wAlice/LinkedGuard

Licensed under MIT.

### Roadmap

- Auto-archive (currently labeled "soon" in the UI - being stabilized for LinkedIn's new shadow-DOM messaging)
- Per-language pre-built lists (FR, ES, DE)
- Right-click "Add sender to allow-list"
- Optional regex mode

### Support

Found a false positive or want a new category? Open an issue on GitHub.
```

---

## Categories (pick up to 3)

Recommended for AMO:

1. **Privacy & Security** ✓ (primary)
2. **Social & Communication** ✓
3. **Search Tools** *(optional - borderline)*

Recommended for Chrome Web Store:

1. **Productivity** (primary)
2. **Social & Communication**!

---

## Tags / Keywords (search terms)

```
linkedin, spam, anti-spam, recruiter, scam filter, inbox, message filter, privacy, productivity, focus, recruitment, crypto scam, phishing, mlm, cold outreach
```

---

## Support / Homepage URLs

| Field | Value |
|---|---|
| Homepage URL | `https://github.com/Sn0wAlice/LinkedGuard` |
| Support URL | `https://github.com/Sn0wAlice/LinkedGuard/issues` |
| Support email | *(your email)* |

---

## Privacy policy (required by both stores)

```markdown
# LinkedGuard - Privacy Policy

LinkedGuard does not collect, transmit, or share any personal data.

## What is stored

The extension stores the following data **locally in your browser only**, using `browser.storage.sync` (with `browser.storage.local` as fallback):

- Your enabled/disabled keyword lists
- Custom keywords you have added
- A rolling log of the last 50 flagged conversations (sender display name, message preview snippet, matched keyword, timestamp)
- Counters for how many conversations have been flagged or archived

This data never leaves your device. It is only accessible to LinkedGuard itself, in your own browser.

## What is NOT done

- No analytics, telemetry, or usage tracking
- No requests to any server other than LinkedIn (and only as part of normal page navigation - LinkedGuard does not initiate network requests)
- No reading of pages other than `https://www.linkedin.com/*`
- No selling, sharing, or monetization of any data

## Permissions

- `storage` - to save your settings locally
- `host_permissions: https://www.linkedin.com/*` - restricts the content script to LinkedIn only

## Removing your data

Uninstalling the extension removes all locally stored data. You can also use the "Reset all settings" button in the options page.

## Contact

For questions: https://github.com/Sn0wAlice/LinkedGuard/issues
```

You can host this as `PRIVACY.md` on the repo and paste the URL into the form, or paste the text directly.

---

## Permissions justifications (Chrome Web Store specifically asks)

| Permission | Justification |
|---|---|
| `storage` | Persist user-configured keyword lists, custom keywords and a local activity log of flagged conversations. All storage is local; nothing is transmitted off-device. |
| `host_permissions` for `https://www.linkedin.com/*` | LinkedGuard reads conversation previews on LinkedIn to match keywords and apply visual flags. This is the sole purpose of the extension and the only domain it touches. |

### "Single purpose" description (Chrome required field)

```
Visually flag unsolicited messages in the user's LinkedIn inbox based on configurable keyword lists.
```

### "Why does your extension need broad host permission?" (if asked)

```
The extension's content script must run on LinkedIn message URLs (full page /messaging/ and overlay panels accessible from /feed/) to read the visible conversation list and apply visual flags on matched senders. No other site is accessed.
```

---

## Screenshots (1280×800 recommended)

Suggested set of 4:

1. **Hero** - overlay messaging on LinkedIn feed, with one matched conversation flagged in red and the tooltip visible. Caption: *"Spotted at a glance - unsolicited messages flagged in your inbox."*
2. **Popup** - toolbar popup showing the toggle, action segment control, and list checkboxes. Caption: *"One click to enable/disable any category."*
3. **Options page - Filter Lists tab** - the list cards with chips. Caption: *"14 built-in categories. Add your own keywords."*
4. **Options page - Activity Log tab** - table of recent events. Caption: *"Local-only activity log. Nothing leaves your device."*

---

## Release notes (for v1.0.0)

```
First public release.

- 14 built-in keyword lists (~180 keywords) covering recruiter spam, crypto scams, MLM, marketing agency pitches, SaaS cold outreach, phishing, and more
- Custom lists with per-list action override
- Visual flagging: red sender name, ⚠ badge with tooltip, red avatar outline
- Activity log of the last 50 flagged conversations
- Works on both the full /messaging/ page and the overlay messaging panel on /feed/
- Shadow-DOM aware (LinkedIn's new interop-outlet messaging UI)
- Runs entirely locally - no network calls, no analytics
```

---

## License

MIT - already declared in `README.md`.
