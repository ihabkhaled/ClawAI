import { describe, expect, it } from 'vitest';

import { detectFileIntent } from '../file-intent.utility';

describe('detectFileIntent', () => {
  // The production false positive of 2026-09-19 and its relatives: prose
  // requests that mention a format must stay in the chat.
  it.each([
    'can you re-write normally text for google docs, not in markdown',
    'can you re-write normally no in markdown',
    'rewrite this without markdown please',
    'rephrase the paragraph above',
    'write a short poem',
    'write a report about climate change',
    'summarize this document',
    'explain what a PDF is',
    'what is the difference between docx and pdf formats?',
    'translate this text to French',
    'format this as a table',
    'give me the answer in plain text',
    'how do I convert a word doc to pdf in windows?',
    'reply in json',
    'is markdown better than html?',
    'write me a memo about the meeting',
    "don't make a file, just answer",
    'no pdf, just tell me',
    'what does a proposal usually contain',
    'hi',
  ])('stays in chat: %s', (message) => {
    expect(detectFileIntent(message).isFileRequest).toBe(false);
  });

  it.each([
    ['generate a pdf about the history of rome', 'strong_word_with_verb'],
    ['create a csv of the top 10 countries by population', 'strong_word_with_verb'],
    ['make me a docx with the meeting notes', 'strong_word_with_verb'],
    ['build a slides deck for my pitch', 'strong_word_with_verb'],
    ['make an excel spreadsheet of my budget', 'strong_word_with_verb'],
    ['create a text file with these steps', 'strong_word_with_verb'],
    ['give me a downloadable file of this', 'strong_word_with_verb'],
    ['write a powerpoint presentation on AI', 'strong_word_with_verb'],
    ['export this answer as markdown', 'soft_word_with_delivery_verb'],
    ['save as txt', 'phrase'],
    ['download as pdf', 'phrase'],
    ['put the result into a file', 'phrase'],
    ['write it to notes.md', 'extension'],
    ['I need report.docx', 'extension'],
    ['generate main.py for a flask app', 'extension'],
    ['export the report', 'soft_word_with_delivery_verb'],
    ['download the markdown', 'soft_word_with_delivery_verb'],
    ['save the document', 'soft_word_with_delivery_verb'],
    ['zip all the files you made', 'strong_word_with_verb'],
    ['GENERATE A PDF', 'strong_word_with_verb'],
    ['what a nice day, generate me a pdf of it', 'strong_word_with_verb'],
  ])('asks for a file: %s', (message, reason) => {
    expect(detectFileIntent(message)).toEqual({ isFileRequest: true, reason });
  });
});
