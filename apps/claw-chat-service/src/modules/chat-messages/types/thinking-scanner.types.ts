// Result of feeding one chunk to the ThinkingFragmentScanner: the cleaned
// answer text and the extracted reasoning text produced by THIS chunk.
export type ScannedFragment = {
  content: string;
  reasoning: string;
};
