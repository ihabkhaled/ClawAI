import { detectFileIntent } from '../file-intent.utility';

const LINKEDIN_PASTE = [
  'Write a LinkedIn post about ClawAI, every AI in one workspace.',
  'Say also talk to models with audio/video ... create files, documents, pdf, docx ... create videos, create images ...',
  'add more 5 6 features, 1-2 words each',
].join('\n');

describe('detectFileIntent — an inline mention of file creation is not a file request', () => {
  it.each([
    ['en linkedin paste (the "Generating txt file..." bug)', LINKEDIN_PASTE],
    ['en say also', 'Say also talk to models, create files, documents, pdf, docx, create videos'],
    ['en capability', 'Our platform can create a pdf, export docx and generate xlsx reports.'],
    [
      'en writing task',
      'Write an article about how teams generate pdf reports and create spreadsheets.',
    ],
    [
      'en bullets under a note',
      'Additional context:\n- create a pdf\n- export a docx\n- generate xlsx',
    ],
    [
      'fr',
      'Dis aussi que la plateforme peut créer des fichiers pdf, des docx et exporter des xlsx.',
    ],
    ['es', 'Menciona también que puede crear archivos pdf, docx y exportar xlsx.'],
    [
      'de',
      'Sag auch, dass die Plattform pdf und docx Dateien erstellen und xlsx exportieren kann.',
    ],
    ['ar', 'قل أيضا إن المنصة يمكنها إنشاء ملفات pdf و docx وتصدير xlsx.'],
    ['en plain feature note', 'Features: create files, export pdf, generate docx.'],
  ])('%s', (_name, message) => {
    expect(detectFileIntent(message).isFileRequest).toBe(false);
  });

  it.each([
    ['en', 'Create a pdf of this summary'],
    ['en polite', 'Hi, can you generate an xlsx budget tracker for me?'],
    ['en after a writing task', 'Write the summary, then export it as a docx file'],
    ['en with also', 'Also create a pdf of the report'],
    ['en leading format', 'pdf: a guide to better sleep'],
  ])('a genuine request still counts: %s', (_name, message) => {
    expect(detectFileIntent(message).isFileRequest).toBe(true);
  });
});
