import { classifyVideoIntent } from '../../video-generation';
import { detectImageGenerationSignals } from '../../image-intent';
import { generationRequestText } from '../generation-request.utility';
import { isMentionSentence, requestSentences } from '../generation-mention.utility';

const LINKEDIN_PASTE = [
  'Write a LinkedIn post about ClawAI, every AI in one workspace.',
  'Say also talk to models with audio/video ... create files, documents, pdf, docx ... create videos, create images ...',
  'add more 5 6 features, 1-2 words each',
].join('\n');

const MENTIONS: ReadonlyArray<readonly [string, string]> = [
  ['en linkedin paste', LINKEDIN_PASTE],
  [
    'en single sentence',
    'Say also talk to models with audio/video, create files, documents, pdf, docx, create videos, create images',
  ],
  ['en capability', 'Our platform can create files, generate images and make videos for you.'],
  ['en plural subject', 'Users can create a pdf, draw logos and produce videos from one prompt.'],
  ['en feature list', 'Features: create files, create videos, create images, create audio.'],
  [
    'en bullets under a note',
    'Additional context:\n- create files\n- create videos\n- generate images',
  ],
  ['en writing task', 'Write an article about how teams generate videos and create pdf reports.'],
  ['en supports', 'ClawAI supports generating images, creating videos and exporting a pdf.'],
  [
    'fr capability',
    'Dis aussi que la plateforme peut créer des fichiers, générer des images et faire des vidéos.',
  ],
  [
    'fr list',
    'Contexte : parler aux modèles, créer des fichiers, créer des vidéos, créer des images.',
  ],
  ['es capability', 'Menciona también que puede crear archivos, generar imágenes y hacer videos.'],
  ['es list', 'Añade también: hablar con modelos, crear archivos, crear videos, crear imágenes.'],
  [
    'de capability',
    'Sag auch, dass die Plattform Dateien erstellen, Bilder generieren und Videos machen kann.',
  ],
  [
    'de list',
    'Zusätzlicher Kontext: mit Modellen sprechen, Dateien erstellen, Videos erstellen, Bilder erstellen.',
  ],
  ['ar capability', 'قل أيضا إن المنصة يمكنها إنشاء ملفات وتوليد صور وإنشاء فيديو.'],
  ['ar list', 'سياق إضافي: التحدث مع النماذج، إنشاء ملفات، إنشاء فيديو، إنشاء صور.'],
];

const REQUESTS: ReadonlyArray<readonly [string, string]> = [
  ['en image', 'Create an image of a lighthouse at dusk'],
  ['en polite', 'Hi, can you generate a picture of a red fox?'],
  ['en also', 'Also create an image for the post'],
  ['en say also', 'Say also make me a logo for it'],
  ['en after a writing task', 'Write a LinkedIn post and draw a cat to go with it'],
  ['en list of requests', 'Create a logo, create a banner, create a poster for my bakery'],
  ['fr image', "S'il te plaît, génère une image d'un phare au coucher du soleil"],
  ['es image', 'Genera una imagen de un faro al atardecer'],
  ['de image', 'Erstelle ein Bild von einem Leuchtturm bei Sonnenuntergang'],
  ['ar image', 'ارسم صورة لقطة تلعب في الحديقة'],
];

const VIDEO_REQUESTS: ReadonlyArray<readonly [string, string]> = [
  ['en', 'Generate a short video of waves hitting a beach'],
  ['en polite', 'Please create a cinematic video of a city at night'],
  ['fr', 'Fais-moi une vidéo courte de vagues sur une plage'],
  ['es', 'Crea un video corto de olas en una playa'],
  ['de', 'Erstelle ein Video von Wellen an einem Strand'],
  ['ar', 'أنشئ لي فيديو قصير لأمواج على شاطئ'],
];

describe('inline mentions of generation are not requests', () => {
  it.each(MENTIONS)('%s: no image, no video, no request text', (_name, message) => {
    expect(detectImageGenerationSignals(message).matched).toBe(false);
    expect(classifyVideoIntent(message)).toBe(false);
    expect(generationRequestText(message)).toBe('');
  });

  it('the LinkedIn paste keeps only its writing task out of every detector', () => {
    expect(requestSentences(LINKEDIN_PASTE)).toStrictEqual([]);
  });

  it('classifies single sentences', () => {
    expect(isMentionSentence('Our app can create files')).toBe(true);
    expect(isMentionSentence('Can you create a file for me')).toBe(false);
    expect(isMentionSentence('Create a pdf of this')).toBe(false);
  });
});

describe('a genuine request still generates', () => {
  it.each(REQUESTS)('%s: image request is kept', (_name, message) => {
    expect(detectImageGenerationSignals(message).matched).toBe(true);
  });

  it.each(VIDEO_REQUESTS)('%s: video request is kept', (_name, message) => {
    expect(classifyVideoIntent(message)).toBe(true);
  });
});
