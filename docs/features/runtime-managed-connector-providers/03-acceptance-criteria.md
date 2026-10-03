# Acceptance criteria

| Criterion                                                                 | Evidence                                                              |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Reject local, metadata, credential-bearing and non-HTTPS cloud URLs       | Provider DTO tests                                                    |
| Connector credentials are encrypted and not returned                      | Existing connector secret tests; connector creation uses that path    |
| Provider auth matches connector auth                                      | Connector create service guard                                        |
| Generic custom provider base URL resolves from its definition             | NVIDIA NIM manager test                                               |
| Model list sync uses configured endpoint and returns provider model       | NVIDIA NIM mocked sync test                                           |
| Runtime provider key survives AUTO candidate filtering                    | Routing candidate test                                                |
| Deactivation hides managed models and rejects new connector/config lookup | Repository filters, provider lookup, and focused service tests        |
| Provider mutations are actor-attributed and secret-free                   | Structured audit events in provider service                           |
| Existing built-ins remain the same                                        | Type/build and existing connector adapter regression tests            |
| Built-ins can be toggled but not edited or deleted                        | Built-in definitions are seeded and update/delete guards protect them |
| Browser, real API, RBAC, device matrix, UAT                               | Open; see QA evidence                                                 |
