/**
 * Shape version of the shared material every role reads. 2 (2026-11-22): the topic box is
 * `authorInstructions` and the chat is `sourceConversation`, so no model reads the box as the
 * article's title. Changing the material changes the prompt hash, so in-flight jobs replay their
 * role calls once.
 */
export const SHARED_MATERIAL_VERSION = 2;

/**
 * How an author reads the material. Production 2026-11-22: a box that said "write a gigantic,
 * never concise thread" produced an article about writing gigantic threads, and the RFID chat it
 * was made from was ignored. The box is interpreted by the model, in any language, never by
 * keywords here.
 */
export const AUTHOR_SOURCE_NOTE =
  'sourceConversation is the primary source: the article covers what that whole conversation discusses and concludes, using every turn (a later turn refines or corrects an earlier one) and every detail it contains. authorInstructions is what the owner typed in the topic box, in any language or a mix of languages. Read it as a subject or question to cover, as instructions about the article itself (length, depth, detail, structure, style, audience, language), or as both. When it only gives instructions, take the subject from sourceConversation and follow the instructions; never write about the instructions themselves or about how to write an article. When it names a subject, cover that subject using the conversation. researchEvidence supports and extends the conversation; ignore evidence items that are not about the article subject. When the instructions ask for a long, exhaustive, detailed or never concise article, write the longest complete article your output allows, cover every point of the conversation in depth and never summarise it away. If sourceConversation has a fitNote, parts of long messages were omitted to fit the model; do not invent what was omitted.';

/** The same reading for the Judge and the Critic, so a draft about the conversation is not marked off-topic. */
export const REVIEW_SOURCE_NOTE =
  "The draft must be about the subject of sourceConversation, or the subject authorInstructions names. authorInstructions (the owner's topic box, any language) may instead or also give instructions about length, depth, style, audience or language: judge whether the draft follows them, and never require the draft to be about the instructions themselves. A draft that covers the conversation's subject while authorInstructions only gives instructions is on topic.";

/**
 * How a file attached to a chat turn reaches the roles (2026-11-22): its extracted text becomes
 * its own turn right after the message it was attached to, so the conversation fit condenses it
 * like any long message (beginning and end kept, the cut named) instead of dropping it.
 */
export const ATTACHMENT_TURN_KIND = 'ATTACHMENT';
/** The framing of an attachment turn: `Attached file <name>:\n<text>`. */
export const ATTACHMENT_TURN_LEAD = 'Attached file ';
