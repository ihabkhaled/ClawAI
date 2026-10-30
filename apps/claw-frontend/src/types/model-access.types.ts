// The plan-access check for the model picker (POST /chat-messages/model-access).
export type ModelAccessRequestEntry = {
  provider: string;
  model: string;
};

export type ModelAccessEntry = ModelAccessRequestEntry & {
  /** May the signed-in user choose this model as the primary? */
  allowed: boolean;
};
