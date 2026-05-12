/* eslint-disable no-console */
import { PrismaClient, WorkflowKind } from '../src/generated/prisma';

const prisma = new PrismaClient();

type WorkflowSeed = {
  workflowKey: string;
  kind: WorkflowKind;
  displayName: string;
  description: string;
  steps: Array<{ kind: string; description: string }>;
  defaultModelTier?: string;
};

const WORKFLOWS: WorkflowSeed[] = [
  {
    workflowKey: 'direct-llm',
    kind: WorkflowKind.DIRECT_LLM,
    displayName: 'Direct LLM',
    description: 'Single LLM call with the routed model. Default for plain text Q&A.',
    steps: [{ kind: 'llm', description: 'Send prompt to selected model and return its answer.' }],
    defaultModelTier: 'A',
  },
  {
    workflowKey: 'search-first',
    kind: WorkflowKind.SEARCH_FIRST,
    displayName: 'Search-first',
    description: 'Run a web search before the LLM call so the model has fresh context.',
    steps: [
      { kind: 'search', description: 'Tavily/SearXNG/Bing web search.' },
      { kind: 'llm', description: 'Pass query + top-N results to model.' },
    ],
    defaultModelTier: 'A',
  },
  {
    workflowKey: 'extract-first',
    kind: WorkflowKind.EXTRACT_FIRST,
    displayName: 'Extract-first',
    description: 'Pull structured data out of attached files before reasoning.',
    steps: [
      { kind: 'extract', description: 'Parse spreadsheet/CSV into structured rows.' },
      { kind: 'llm', description: 'Reason over the extracted data.' },
    ],
    defaultModelTier: 'A',
  },
  {
    workflowKey: 'pdf-extraction',
    kind: WorkflowKind.PDF_EXTRACTION,
    displayName: 'PDF Extraction + Summarize',
    description: 'Extract text from PDF then summarize/analyze.',
    steps: [
      { kind: 'pdf_extract', description: 'Run pdf-parse/Unstructured/Textract.' },
      { kind: 'llm', description: 'Summarize / answer questions over extracted text.' },
    ],
    defaultModelTier: 'A',
  },
  {
    workflowKey: 'youtube-transcript',
    kind: WorkflowKind.YOUTUBE_TRANSCRIPT,
    displayName: 'YouTube Transcript + Summarize',
    description: 'Fetch the YouTube transcript then ask the model to summarize.',
    steps: [
      { kind: 'youtube_fetch', description: 'Retrieve transcript via YouTube Data API.' },
      { kind: 'llm', description: 'Summarize transcript with timestamps.' },
    ],
    defaultModelTier: 'A',
  },
  {
    workflowKey: 'image-analysis',
    kind: WorkflowKind.IMAGE_ANALYSIS,
    displayName: 'Image Analysis',
    description: 'Vision model describes / answers questions about an attached image.',
    steps: [{ kind: 'vision_llm', description: 'Vision-capable LLM call.' }],
    defaultModelTier: 'A',
  },
  {
    workflowKey: 'image-generation',
    kind: WorkflowKind.IMAGE_GENERATION,
    displayName: 'Image Generation',
    description: 'Generate an image via diffusion model (FLUX, SDXL, DALL-E, Imagen).',
    steps: [
      { kind: 'prompt_rewrite', description: 'Refine user prompt for diffusion.' },
      { kind: 'image_gen', description: 'Diffusion model call.' },
    ],
    defaultModelTier: 'A',
  },
  {
    workflowKey: 'video-analysis',
    kind: WorkflowKind.VIDEO_ANALYSIS,
    displayName: 'Video Analysis',
    description: 'Frame-sample + transcribe + summarize a video file.',
    steps: [
      { kind: 'frame_sample', description: 'Sample N keyframes via ffmpeg.' },
      { kind: 'audio_transcribe', description: 'Whisper transcription.' },
      { kind: 'vision_llm', description: 'Describe frames + reconcile with transcript.' },
    ],
    defaultModelTier: 'S',
  },
  {
    workflowKey: 'audio-transcribe',
    kind: WorkflowKind.AUDIO_TRANSCRIBE,
    displayName: 'Audio Transcription',
    description: 'Transcribe + summarize an audio file (Whisper/Piper).',
    steps: [
      { kind: 'transcribe', description: 'Whisper/Piper local or cloud STT.' },
      { kind: 'llm', description: 'Summarize transcript on request.' },
    ],
    defaultModelTier: 'A',
  },
  {
    workflowKey: 'file-generation',
    kind: WorkflowKind.FILE_GENERATION,
    displayName: 'File Generation (CSV/DOCX/PDF)',
    description: 'LLM produces structured content; file-generation-service writes the file.',
    steps: [
      { kind: 'llm_structured', description: 'Model emits JSON/markdown structure.' },
      { kind: 'file_render', description: 'claw-file-generation-service renders output.' },
    ],
    defaultModelTier: 'A',
  },
  {
    workflowKey: 'code-review',
    kind: WorkflowKind.CODE_REVIEW,
    displayName: 'Code Review',
    description: 'Static-lens code analysis + judge pass for non-trivial reviews.',
    steps: [
      { kind: 'llm', description: 'Primary code-review pass with strong coding model.' },
      { kind: 'judge', description: 'Judge model double-checks the review for hallucinated bugs.' },
    ],
    defaultModelTier: 'S',
  },
  {
    workflowKey: 'compare-ensemble',
    kind: WorkflowKind.COMPARE_ENSEMBLE,
    displayName: 'Compare / Ensemble',
    description: 'Fire 2-3 candidate models in parallel and present compared outputs.',
    steps: [
      { kind: 'fanout_llm', description: 'Run prompt against N models in parallel.' },
      { kind: 'aggregate', description: 'Merge outputs into a comparison view.' },
    ],
    defaultModelTier: 'A',
  },
  {
    workflowKey: 'judge-pipeline',
    kind: WorkflowKind.JUDGE_PIPELINE,
    displayName: 'Judge Pipeline (high-stakes)',
    description: 'Primary answer + judge model verifies for medical/legal/financial risk.',
    steps: [
      { kind: 'llm', description: 'Primary answer.' },
      { kind: 'judge', description: 'Judge verifies; escalates if needed.' },
    ],
    defaultModelTier: 'S',
  },
];

async function main(): Promise<void> {
  console.log(`Seeding ${WORKFLOWS.length} router workflows...`);
  for (const wf of WORKFLOWS) {
    await prisma.routerWorkflow.upsert({
      where: { workflowKey: wf.workflowKey },
      create: {
        workflowKey: wf.workflowKey,
        kind: wf.kind,
        displayName: wf.displayName,
        description: wf.description,
        steps: wf.steps,
        defaultModelTier: wf.defaultModelTier ?? 'A',
        isEnabled: true,
      },
      update: {
        displayName: wf.displayName,
        description: wf.description,
        steps: wf.steps,
      },
    });
  }
  const count = await prisma.routerWorkflow.count();
  console.log(`Seed complete. Workflows table has ${count} rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
