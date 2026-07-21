# NeoAnki Extensions

This repository is the public, review-gated catalog used by NeoAnki apps to discover extensions.

- Catalog endpoint: `https://raw.githubusercontent.com/neoanki/extensions/main/catalog.json`
- Schema: [`schema/catalog.schema.json`](schema/catalog.schema.json)
- Submission and approval policy: [`CONTRIBUTING.md`](CONTRIBUTING.md)

`main` is the approved marketplace. Publishers propose a signed GitHub Release package through a pull request; automation validates identity, immutable download location, SHA-256, SDK version, permissions, and signing-key continuity. Maintainer review covers ownership, provenance, privacy, permission scope, licensing, user experience, and pedagogical claims.

The catalog includes independently released first-party extensions for [Card Timer](https://github.com/neoanki/neoanki-card-timer), [Collection Insights](https://github.com/neoanki/neoanki-insights), [Text to Speech](https://github.com/neoanki/neoanki-tts), [More Card Types](https://github.com/neoanki/neoanki-prompt-types), [Image Occlusion](https://github.com/neoanki/neoanki-image-occlusion), [Anki & CSV Import/Export](https://github.com/neoanki/neoanki-interoperability), [Review Priorities](https://github.com/neoanki/neoanki-recovery-policies), [Goals & Saved Searches](https://github.com/neoanki/neoanki-workspace), and [Learning Packs](https://github.com/neoanki/neoanki-shared-packs). Development examples signed with test keys are not production marketplace listings.

## Trust model

Catalog approval makes changes visible and auditable. It does not guarantee that an extension is safe or educationally effective. NeoAnki desktop independently downloads the exact approved asset, verifies its SHA-256 and Ed25519 signature, compares catalog metadata, and asks the user to review capabilities before installation.

## Local validation

Requires Node.js 24 and `unzip`:

```sh
node scripts/validate-catalog.mjs
```
