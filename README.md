# fluxtax.com

Flux Tax site (no candidate name on it, Darren's call 2026-11-02). Static site on GitHub Pages, same setup as `~/montana2028`.

## Pages
- `index.html`: home. Seed line headline, short intro, then the Act's plain-language summary. docKey `fluxtax_home`.
- `book.html`: *The Flux Tax: A Revolution in Voluntary Taxation*, full text. docKey `fluxtax_book`.
- `act.html`: *The Montana Flux Tax Act*, full bill. docKey `fluxtax_act`.

Book and Act text come from Genesis `docs/campaign/bills/flux-tax-book.md` and `montana-flux-tax-act.md`, converted with pandoc on 2026-11-02. If those change, the pages need regenerating.

## Blabs
`blab.js` is copied from montana2028 (only the header comment and email subject differ). Blabs go to BT Firestore (`blabbertree-app`), collection `blabs`. Identity rules for `fluxtax_*` docKeys live in `~/montana2028/firebase/firestore.rules` (the one live ruleset for both sites). New-blab emails go through FormSubmit to dkarr@mac.com, subject "New blab on Flux Tax: <page>".
