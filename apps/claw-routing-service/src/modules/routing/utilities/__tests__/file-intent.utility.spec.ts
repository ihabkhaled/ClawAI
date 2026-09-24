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
    // 'document' moved from SOFT to STRONG (F6, 2026-09-24); 'markdown' stays
    // SOFT because "write it in markdown" is a formatting request.
    ['export this answer as markdown', 'soft_word_with_delivery_verb'],
    ['save as txt', 'phrase'],
    ['download as pdf', 'phrase'],
    ['put the result into a file', 'phrase'],
    ['write it to notes.md', 'extension'],
    ['I need report.docx', 'extension'],
    ['generate main.py for a flask app', 'extension'],
    ['export the report', 'soft_word_with_delivery_verb'],
    ['download the markdown', 'soft_word_with_delivery_verb'],
    ['save the document', 'strong_word_with_verb'],
    ['zip all the files you made', 'strong_word_with_verb'],
    ['GENERATE A PDF', 'strong_word_with_verb'],
    ['what a nice day, generate me a pdf of it', 'strong_word_with_verb'],
  ])('asks for a file: %s', (message, reason) => {
    expect(detectFileIntent(message)).toEqual({ isFileRequest: true, reason });
  });

  // F6 (2026-09-24): a user typing in their own language, naming the format
  // in Latin script, must still route to file generation — the create/
  // delivery verb is in their language too, and the old ASCII-only tokenizer
  // dropped it entirely, so every one of these silently stayed in chat.
  it.each([
    ['اعمل لي ملف PDF عن فوائد النوم', 'ar'],
    ['اصنع لي ملف csv فيه 5 منتجات', 'ar'],
    ['اعمل لي ملف اكسل لميزانية شهرية', 'ar (excel loanword)'],
    ['erstelle ein PDF über Ernährung', 'de'],
    ['crea un PDF sobre nutrición', 'es'],
    ['برای من یک PDF بساز', 'fa'],
    ['crée un PDF sur les bienfaits du sport', 'fr'],
    ['बजट के बारे में एक pdf बनाओ', 'hi'],
    ['crea un PDF sulla nutrizione', 'it'],
    ['栄養についてPDFを作成して', 'ja'],
    ['crie um PDF sobre nutrição', 'pt'],
    ['создай PDF о питании', 'ru'],
    ['สร้าง PDF เกี่ยวกับโภชนาการ', 'th'],
    ['生成一个关于营养的PDF', 'zh'],
  ])('asks for a file in its own language (%s / %s)', (message) => {
    expect(detectFileIntent(message).isFileRequest).toBe(true);
  });

  it.each([
    ['لا تعمل ملف pdf، فقط أجب', 'ar'],
    ['erstelle kein PDF, nur Text', 'de'],
    ['ne crée pas de PDF, réponds juste dans le chat', 'fr'],
  ])('a negated format stays in chat, translated too (%s / %s)', (message) => {
    expect(detectFileIntent(message).isFileRequest).toBe(false);
  });

  // F6 (2026-09-24): a message that OPENS with the bare format name and no
  // verb at all ("pdf: a guide to sleep", "csv of 5 planets", "xlsx budget
  // tracker") is a real, common phrasing (terse chat users, a colon
  // shorthand) that the create/delivery-verb rule always missed — it read
  // as prose and stayed in chat.
  it.each([
    'pdf: 1-page guide to saving money on groceries',
    'xlsx budget tracker 5 rows',
    'csv of 5 planets with diameter',
    'docx: meeting notes template',
  ])('a leading format word alone asks for a file: %s', (message) => {
    expect(detectFileIntent(message)).toEqual({
      isFileRequest: true,
      reason: 'leading_strong_word',
    });
  });

  // F6 (2026-09-24): an unambiguous format name paired with a CREATE verb
  // (not just a delivery verb) is a file request, in any of the 13 UI
  // locales — "write a word document", "اعمل لي ملف markdown", "genera un
  // documento Word" all failed before document/txt/documento and the local
  // words for "file" became STRONG.
  it.each([
    'write a word document with a short checklist for moving apartments',
    'اعمل لي ملف markdown عن ملخص كتاب',
    'give me a txt file with five plain tips for studying',
    'genera un documento Word con una carta de presentación',
  ])('a format name with a create verb asks for a file: %s', (message) => {
    expect(detectFileIntent(message).isFileRequest).toBe(true);
  });

  it.each([
    // the strong word must be the FIRST token — mid-sentence stays governed
    // by the existing create/deliver-verb rule, so plain mentions still stay
    // in chat.
    'I have a question about xlsx files',
    'quick csv question',
  ])('a strong word later in the sentence still needs a verb: %s', (message) => {
    expect(detectFileIntent(message).isFileRequest).toBe(false);
  });

  // A format NAME that is also an ordinary word, or a formatting/coding
  // request, is not a file on its own: these read as chat in English, so the
  // leading-word rule and the create-verb rule must not fire on them.
  it.each([
    'write a word that rhymes with orange',
    'word '.repeat(150).trim(),
    'can you write it in markdown please',
    'write html for a login button',
    'write docs for this API endpoint',
    'write a json schema for a user object',
    'html: how do I center a div',
    'json vs yaml, which is better for config',
    'zip codes in cairo',
    'json file parsing error in node',
    'html file will not load in chrome',
  ])('an ambiguous format word stays in chat: %s', (message) => {
    expect(detectFileIntent(message).isFileRequest).toBe(false);
  });

  // The word "file" itself, in each UI locale, is as strong as English "file".
  it.each([
    ['اعمل لي ملف عن فوائد النوم', 'ar'],
    ['اكتب لي مستند وورد عن خطة عمل لمشروع صغير', 'ar (document)'],
    ['اعمل لي عرض تقديمي عن الذكاء الاصطناعي', 'ar (presentation)'],
    ['crée un fichier avec la liste des courses', 'fr'],
    ['crea un archivo con la lista de compras', 'es'],
    ['erstelle eine datei mit der einkaufsliste', 'de'],
    ['создай файл со списком покупок', 'ru'],
  ])('a create verb with the local word for "file" asks for a file: %s (%s)', (message) => {
    expect(detectFileIntent(message).isFileRequest).toBe(true);
  });

  // Live 2026-09-25: "json file with 3 users: id, name, email" stayed in chat
  // on 8/8 models. "<format> file with/of/for/containing…" opening a message
  // describes the file's content, which a bug report does not.
  it.each([
    'json file with 3 users: id, name, email',
    'markdown file of study notes on git branching',
    'html file for a coffee shop landing page',
    'txt file containing five study tips',
  ])('a leading "<format> file with…" asks for a file: %s', (message) => {
    expect(detectFileIntent(message)).toEqual({
      isFileRequest: true,
      reason: 'leading_strong_word',
    });
  });
});
