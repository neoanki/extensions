# Submit an extension

The marketplace is a reviewed Git catalog. A pull request that adds or updates one entry in `catalog.json` is the submission; merging it is the approval record.

## Before submitting

1. Publish the extension source in a public GitHub repository with a license, build instructions, privacy behavior, and user documentation.
2. Build and sign an SDK 2 `.neoanki-extension` package.
3. Attach that exact package to a GitHub Release. Do not use a mutable branch, `latest` URL, Actions artifact, or external download host.
4. Compute `shasum -a 256 your-package.neoanki-extension` and add the digest and package metadata to `catalog.json`, keeping entries sorted by id.
5. Open a pull request and complete the template. CI downloads the package and verifies its size, hash, manifest identity, permissions, SDK version, repository continuity, and signing-key continuity.

Maintainers additionally review publisher control, source/build provenance, permission scope, privacy behavior, license, user experience, and learning claims. Approval can be withdrawn by a follow-up pull request for security, policy, abandonment, or persistent quality problems.

Publisher signing keys cannot be changed in a normal update. For a legitimate key rotation, open a private security report before losing access to the old key.

## Review policy

- One code-owner approval, all conversations resolved, and the required `validate` check are required.
- An extension may not impersonate NeoAnki, hide material data collection, request unjustified permissions, facilitate academic dishonesty, or present unsupported pedagogical/medical claims as fact.
- Network domains and data flows must be disclosed in the extension repository.
- Marketplace review is not a sandbox or a warranty. NeoAnki still verifies the signed package and shows capabilities for explicit confirmation before installation.
