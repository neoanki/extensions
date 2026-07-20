# NeoAnki Extensions

This repository is the public, review-gated catalog used by NeoAnki apps to discover extensions.

- Catalog endpoint: `https://raw.githubusercontent.com/neoanki/extensions/main/catalog.json`
- Schema: [`schema/catalog.schema.json`](schema/catalog.schema.json)
- Submission and approval policy: [`CONTRIBUTING.md`](CONTRIBUTING.md)

`main` is the approved marketplace. Publishers propose a signed GitHub Release package through a pull request; automation validates identity, immutable download location, SHA-256, SDK version, permissions, and signing-key continuity. Maintainer review covers ownership, provenance, privacy, permission scope, licensing, user experience, and pedagogical claims.

The catalog includes independently released first-party extensions for [Card Timer](https://github.com/neoanki/neoanki-card-timer), [Memory Insights](https://github.com/neoanki/neoanki-insights), and [NeoAnki TTS](https://github.com/neoanki/neoanki-tts). Development examples signed with test keys are not production marketplace listings.

## Trust model

Catalog approval makes changes visible and auditable. It does not guarantee that an extension is safe or educationally effective. NeoAnki desktop independently downloads the exact approved asset, verifies its SHA-256 and Ed25519 signature, compares catalog metadata, and asks the user to review capabilities before installation.

## Local validation

Requires Node.js 24 and `unzip`:

```sh
node scripts/validate-catalog.mjs
```
