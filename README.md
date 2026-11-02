# fluxtax.com

The Flux Tax site. General, not tied to any state or campaign, and no name on it (Darren's call 2026-11-02). Static site on GitHub Pages (custom domain via `CNAME`). DNS at GoDaddy: four A records to GitHub Pages, `www` CNAME to `darkarr11.github.io`.

## Pages
- `index.html`: home. Seed line headline, then the idea in short. docKey `fluxtax_home`.
- `book.html`: *The Flux Tax: A Revolution in Voluntary Taxation*, full text, converted with pandoc 2026-11-02. docKey `fluxtax_book`.

## Look
Its own look, separate from montana2028 (2026-11-02): emerald and mint palette, Inter font, header banner with a wave graphic (`waves.svg`) and a logo mark (inline SVG in each page). `share.png` is the 1200x630 link preview and `cover.jpg` the book cover (home page card, links to the book), both rendered with headless Chrome. No author name on the cover.

## Blabs (`blab.js`, `demo.js`)
Readers highlight any passage and blab on it, plus a General discussion box at the bottom. "Watch how it works" plays a scripted demo (used-goods example, made-up names, nothing saved). Blabs are stored in Blabbertree's Firestore (`blabbertree-app`), collection `blabs`. Anonymous by default; Google sign-in shows the account name. A name never comes from a text box.

- **Rules:** this repo has no rules file. The live ruleset is kept in the private blabbertree repo, `firebase-live/firestore.rules`.
- **Email alerts:** each new blab goes through FormSubmit to dkarr@mac.com, subject "New blab on Flux Tax: <page>". docKeys ending in `_test` never email.
- **Moderation:** blabs can't be deleted from the client. Use the Firebase console.
