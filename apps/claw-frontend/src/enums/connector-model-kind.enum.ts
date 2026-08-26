// What a synced deployment is FOR. Only CHAT is user-executable; the rest are
// infrastructure and must never appear in a user's model picker.
export enum ConnectorModelKind {
  CHAT = 'CHAT',
  EMBEDDING = 'EMBEDDING',
  RERANKER = 'RERANKER',
  TOOL = 'TOOL',
}
