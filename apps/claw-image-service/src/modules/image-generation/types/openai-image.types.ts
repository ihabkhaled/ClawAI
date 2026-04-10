export type OpenAIImageData = {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
};

export type OpenAIImageResponse = {
  created: number;
  data: OpenAIImageData[];
};
