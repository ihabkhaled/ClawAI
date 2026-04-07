import { z } from "zod";

export const VALID_MEMORY_TYPES = new Set<string>(["FACT", "PREFERENCE", "INSTRUCTION", "SUMMARY"]);

export const extractionResultSchema = z.array(
  z.object({
    type: z.string().min(1),
    content: z.string().min(1).max(2000),
  }),
);

export const EXTRACTION_PROMPT = `You are a memory extraction engine. Given an AI assistant's response to a user, extract any notable facts, preferences, or instructions that should be remembered for future conversations.

Rules:
- Only extract information that would be useful in future conversations
- Each extraction must have a type: FACT, PREFERENCE, INSTRUCTION, or SUMMARY
- FACT: objective information mentioned (e.g., "User works at Company X", "User has a dog named Max")
- PREFERENCE: stated likes/dislikes (e.g., "User prefers Python over JavaScript")
- INSTRUCTION: standing instructions (e.g., "Always respond in bullet points")
- SUMMARY: brief summary of the conversation topic
- Return an empty array [] if nothing worth remembering
- Maximum 3 extractions per response
- Keep each extraction under 200 characters

Respond with ONLY a JSON array (no markdown, no explanation):
[{"type":"FACT","content":"..."},{"type":"PREFERENCE","content":"..."}]

User message: {userMessage}

Assistant response: {assistantResponse}`;
