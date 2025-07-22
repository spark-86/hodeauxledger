# HodeauxLedger

> “The only trustworthy record is the one you can’t rewrite.”

**This is that record**.

## 🧭 What it is

HodeauxLedger is a cryptographically signed, append-only ledger for anchoring truth, time, and trust—without centralization, consensus games, or speculative overhead.

It’s not a blockchain.
It’s not a cryptocurrency.
**It’s a protocol for memory.**

Please read a little on the theory behind all this in our docs on [Temporal Cryptophysics](https://github.com/veronicahodo/temporal-cryptophysics/).

## 🧬 Why it exists

Because consensus can be gamed.
Because identities get stolen, erased, rewritten.
Because in the end, **we needed a structure** that remembers what happened and who said it—without trusting an intermediary.

This is about epistemology at scale:
What was said?
By whom?
When?
And can we prove it, years later, without asking permission?

HodeauxLedger lets anyone publish an immutable, signed record.
It is federated by design.
It is simple enough to run on a $5 device.
And it’s strict enough to mean something—forever.

🔹 The Core Design
Every record is a R⬢ — a minimal, standalone, hash-chained object.

Each R⬢ includes:

-   `previous_hash` - The base64 hash of the previous record
-   **`protocol`** - The current version of the record being appended
-   **`scope`** - The hierarchical scope of the record (e.g., `self`, `public`, `private`)
-   **`nonce`** - A random value to prevent replay attacks
-   `at` - The timestamp of when the record was created, in JS time format
-   **`record_type`** - A string representing the type of record (e.g., `key:grant`, `policy:set`, `scope:create`)
-   **`data`** - a freeform object, typically assumed to have a `schema` field in the object that can be used to validate the data structure
-   `signatures` – Array of objects [{ fingerprint, signature, type }]. Each signature is a Base64 Ed25519 signature over the record’s canonical JSON (RFC 8785) that includes the signer’s own fingerprint and type; common type values are owner, quorum, and relay
-   `current_hash` - SHA256 base64 hash of the whole record.

Signatures are Ed25519.
Links are shallow.
Scopes are hierarchical, but trust is contextual and signed, not assumed.

## 🗂️ Federation, Not Consensus

HodeauxLedger doesn’t require a global chain or quorum to function.

Each node (called an Usher) is responsible for:

-   Serving one or more `scopes`
-   Signing what it receives
-   Forwarding what it can’t serve
-   Optionally enforcing policy or quorum logic

This is not about universal agreement.
It’s about locally enforceable, globally legible truth.

## 🧠 Intended Use Cases

-   Self-sovereign identity (`SelfID`)
-   Signed pattern analysis (`VeroScope`)
-   Decentralized attestation & contracts
-   Long-term archival of human events
-   Truthful AI input/output accountability
-   Universal basic income & aid registries
-   And any system that benefits from trust without revision.

## 🔐 Our Commitments

-   **Append-only.** No edits, no deletes, no takebacks.
-   **Cryptographic honesty.** Every action must be signed.
-   **Protocol before product.** No monetization layers, no VC tokens.
-   **Federation over control.** This is built to be mirrored, not owned.

We do not build in silence.
All records are public unless intentionally scoped otherwise.
**We operate under the [HodoTrust](https://github.com/veronicahodo/temporal-cryptophysics/blob/main/hodo-trust.md)**—an ethical commitment to transparency, autonomy, and care.

## 🚧 Project Status

Early but functional.

-   Usher (the node/server/CLI) runs on Node.js
-   SQLite caching for keys + records
-   gRPC transport between nodes
-   Genesis support, hot key detection, and full R⬢ validation logic live
-   Experimental identity layer (SelfID) in development

It’s still raw.
But it works.
And it’s clean enough to trust already.

## 📍 Start Here

[Temporal Cryptophysics](https://github.com/veronicahodo/temporal-cryptophysics/)

[GitHub Repo](https://github.com/spark-86/hodeauxledger)

Genesis Record: [R⬢://genesis](rhex://genesis)

Spec draft: trust.archi (coming soon)

Demo nodes coming Q3 2025

## 🗣️ Why We’re Telling You

Because you understand what happens when we let systems remember without integrity.
Because we want feedback from people who think in key material, not clout.
And because we’d rather be held to account by the best… than ignored by the rest.

If this resonates—poke at it.
If you spot a flaw—log it.
If you want to build—fork it, scope it, sign it.

Just don’t let truth rot in silence.

Respectfully,
Veronica Hodo
