// The only thing a gateway is ever told. Deliberately carries no outcome: a
// forger must not be able to learn from the response whether their signature
// was accepted, whether the session exists, or what happened next.
export type WebhookAck = {
  readonly received: true;
};
