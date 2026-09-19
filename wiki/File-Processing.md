# File Processing

File behavior is split across two services plus chat/frontend attachment surfaces.

## File service
- `files`
- `health`

## File-generation service
- `file-generation`
- `health`

The architecture covers upload validation, storage, extraction/chunking/retrieval, attachment-to-message binding, viewer surfaces and generated/downloadable artifacts.

Sources: [docs/FILE_SUPPORT_ARCHITECTURE.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/FILE_SUPPORT_ARCHITECTURE.md) · [rules/42-attachment-understanding.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/42-attachment-understanding.md) · [[File service|Service-claw-file-service]] · [[File generation service|Service-claw-file-generation-service]].
