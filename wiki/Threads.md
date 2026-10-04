> **Wiki source:** [`docs/02-business-product/clawai-threads-product-spec.md`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/clawai-threads-product-spec.md)

# ClawAI Threads

Threads turns private chat into sourced publications through asynchronous
multi-model review. Generation records public intent after a clear disclosure;
the draft remains private until its owner approves publication.

## Product choices

- Article, research article, guide, and technical explanation formats.
- Three to five authors; unanimous agreement on the exact draft hash; Judge at
  least 80; Critic at least 75; up to three rounds.
- A user-selected spend cap is required. Existing plan and credit rules apply;
  there is no new PAYG price.
- Authenticated users can comment, react, and request changes under existing
  moderation controls.
- Approved publications are independently indexable. Chat-share lockdown stays.
- Approved revisions remain public anonymously after account deletion; private
  snapshots and generation artifacts are erased.

## Architecture

`claw-threads-service` owns publications and community state.
`claw-thread-generation-service` owns isolated jobs. Chat provides filtered
immutable snapshots and research-service provides evidence. Read
[the architecture](https://github.com/ihabkhaled/ClawAI/blob/main/docs/03-architecture/clawai-threads-architecture.md)
and [ADR-159](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-159-clawai-threads-two-service-architecture.md).

The existing `/api/v1/threads` route remains the chat-thread alias. Publication
APIs use `/api/v1/thread-publications`.

The two service containers probe `/api/v1/health` over loopback HTTP with
Node's built-in `fetch`; see the [deployment architecture](https://github.com/ihabkhaled/ClawAI/blob/main/docs/03-architecture/clawai-threads-architecture.md#deployment).
