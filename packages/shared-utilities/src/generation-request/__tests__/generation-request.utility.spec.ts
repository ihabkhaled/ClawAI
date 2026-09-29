import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { detectImageGenerationSignals } from '../../image-intent';
import { detectSaveToContextIntent, generationRequestText } from '../generation-request.utility';
import { SaveIntentTarget } from '../save-intent-target.enum';

const MYONCARE_HEAD = readFileSync(join(__dirname, 'fixtures', 'myoncare-pack-head.md'), 'utf8');

function padded(chars: number): string {
  let out = MYONCARE_HEAD;
  let index = 1;
  while (out.length < chars) {
    out += `\n\n## ${String(index)}. SECTION\n\nWearable data syncs every ${String(index)} minutes; the chart shows the latest reading. Diagram of the flow lives in the portal.\n`;
    index += 1;
  }
  return out;
}

describe('generationRequestText — negation (owner bug 10)', () => {
  it.each([
    ['en', 'Do not generate an image of a cat.'],
    ['en', "Don't draw a picture, just explain."],
    ['en', 'Never create an illustration for this.'],
    ['ar', 'لا ترسم صورة لقطة.'],
    ['de', 'Erstelle kein Bild von einer Katze.'],
    ['es', 'No generes una imagen de un gato.'],
    ['fa', 'تصویر نساز، فقط توضیح بده.'],
    ['fr', 'Ne génère pas une image de chat.'],
    ['hi', 'बिल्ली की तस्वीर मत बनाओ।'],
    ['it', "Non generare un'immagine di un gatto."],
    ['ja', '猫の画像を生成しないでください。'],
    ['pt', 'Não gere uma imagem de um gato.'],
    ['ru', 'Не рисуй картинку кота.'],
    ['th', 'อย่าสร้างรูปภาพแมว'],
    ['zh', '不要生成猫的图片。'],
  ])('%s: "%s" is not an image request', (_locale, message) => {
    expect(detectImageGenerationSignals(message).matched).toBe(false);
  });

  it('keeps the positive clause next to a negated one', () => {
    expect(
      detectImageGenerationSignals("Don't make it dark, draw a cat in watercolor").matched,
    ).toBe(true);
    expect(generationRequestText("Don't make it dark, draw a cat")).toContain('draw a cat');
  });

  // Positive phrases the generation table already covers; the filter must not
  // cost any of them. (German/Chinese bare phrasing is a table gap, not this.)
  it.each(['Generate an image of a cat', 'ارسم صورة لقطة', 'Draw me a cat, no background'])(
    'still detects the plain request "%s"',
    (message) => {
      expect(detectImageGenerationSignals(message).matched).toBe(true);
    },
  );
});

describe('generationRequestText — pasted documents', () => {
  it.each([1_101, 45_000, 60_000, 150_000, 250_000])(
    'the Myoncare pack padded to %i chars is not an image request',
    (size) => {
      const pack = size <= MYONCARE_HEAD.length ? MYONCARE_HEAD : padded(size);
      expect(detectImageGenerationSignals(pack).matched).toBe(false);
    },
  );

  it('honours an explicit request placed before a pasted document', () => {
    const message = `Draw an illustration of this workflow:\n\n${padded(20_000)}`;
    expect(detectImageGenerationSignals(message).matched).toBe(true);
  });

  it('ignores image words that only occur inside the pasted body', () => {
    const body = padded(5_000).replace(
      '## 3. SECTION',
      '## 3. SECTION\n\nGenerate a diagram image of the portal.',
    );
    expect(detectImageGenerationSignals(`Summarize this for me.\n\n${body}`).matched).toBe(false);
  });
});

describe('detectSaveToContextIntent (owner feature 11)', () => {
  it.each([
    ['Save this as memory: I work at Myoncare.', SaveIntentTarget.MEMORY],
    ['Remember this: my manager is Sara.', SaveIntentTarget.MEMORY],
    ['Add this to my context pack:\n\n# Rules\n\nUse metric units.', SaveIntentTarget.CONTEXT_PACK],
    ['احفظ هذا في الذاكرة: أعمل في مايونكير', SaveIntentTarget.MEMORY],
    ['تذكر هذا: اسمي إيهاب', SaveIntentTarget.MEMORY],
    ['أضف هذا إلى السياق: قواعد المشروع', SaveIntentTarget.CONTEXT_PACK],
    ['Merk dir das: ich arbeite bei Myoncare.', SaveIntentTarget.MEMORY],
    ['Souviens-toi de ça : je travaille chez Myoncare.', SaveIntentTarget.MEMORY],
    ['Recuerda esto: trabajo en Myoncare.', SaveIntentTarget.MEMORY],
    ['Ricorda questo: lavoro in Myoncare.', SaveIntentTarget.MEMORY],
    ['Lembre-se disso: trabalho na Myoncare.', SaveIntentTarget.MEMORY],
    ['Запомни это: я работаю в Myoncare.', SaveIntentTarget.MEMORY],
    ['این را به خاطر بسپار: من در Myoncare کار می‌کنم.', SaveIntentTarget.MEMORY],
    ['इसे याद रखो: मैं Myoncare में काम करता हूँ।', SaveIntentTarget.MEMORY],
    ['これを覚えて：私はMyoncareで働いています。', SaveIntentTarget.MEMORY],
    ['记住这个：我在Myoncare工作。', SaveIntentTarget.MEMORY],
    ['จำสิ่งนี้ไว้: ฉันทำงานที่ Myoncare', SaveIntentTarget.MEMORY],
  ])('"%s" → %s', (message, target) => {
    const intent = detectSaveToContextIntent(message);
    expect(intent?.target).toBe(target);
  });

  it('extracts the payload after the command and picks the memory type', () => {
    expect(detectSaveToContextIntent('Remember this: always answer in British English.')).toEqual({
      target: SaveIntentTarget.MEMORY,
      memoryType: 'INSTRUCTION',
      content: 'always answer in British English.',
    });
    expect(
      detectSaveToContextIntent('Save this as a preference: I like short answers.')?.memoryType,
    ).toBe('PREFERENCE');
    expect(
      detectSaveToContextIntent('Save this as memory: my team has 6 QA engineers.')?.memoryType,
    ).toBe('FACT');
  });

  it('returns an empty payload when the command stands alone (caller uses the previous message)', () => {
    expect(detectSaveToContextIntent('save this as memory')?.content).toBe('');
  });

  it.each([
    'What do you remember about me?',
    'Can you save the file as PDF?',
    'Remember when we talked about Paris? What was the hotel?',
    'How do I add context to a React component?',
    'Generate an image of a memory card game',
  ])('does not fire on the ordinary message "%s"', (message) => {
    expect(detectSaveToContextIntent(message)).toBeNull();
  });

  it('a save request is never a generation request', () => {
    const message = `Save this as context:\n\n${padded(8_000)}\n\nGenerate a diagram image of it.`;
    expect(generationRequestText(message)).toBe('');
    expect(detectImageGenerationSignals(message).matched).toBe(false);
  });
});
