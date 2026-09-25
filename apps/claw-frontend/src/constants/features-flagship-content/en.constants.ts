import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { FeaturesFlagshipDictionary } from '@/types/features-cluster.types';

export const EN_FEATURES_FLAGSHIP_CONTENT: FeaturesFlagshipDictionary = {
  capabilitiesIntro:
    'The sections above are the short version. Each capability below has a full page: what the feature actually does, how it is gated or metered, and the limits that apply, checked against the shipped product.',
  cardSummaries: {
    [FeatureCapability.MULTIMODAL_AI]:
      'Voice and video notes, a helper that describes images for models that cannot see, and routing that picks a model able to handle the attachment.',
    [FeatureCapability.FILES_FROM_CHAT]:
      'Ask for a PDF, a spreadsheet or a slide deck in plain language and get a real file back, named by the model that wrote it.',
    [FeatureCapability.SMART_ATTACHMENTS]:
      'Drop documents, code, media or whole archives into the chat; every upload is virus-scanned and its text extracted for the model.',
    [FeatureCapability.NARRATED_RESEARCH]:
      'A research loop that decides whether to search or crawl, narrates each step as it works, and respects robots.txt on every fetch.',
    [FeatureCapability.ORCHESTRATION_LABS]:
      'Dedicated labs that put several models on one problem — compare with a judge, consensus, escalation, verification and more.',
    [FeatureCapability.CONVERSATION_TOOLS]:
      'Branch a conversation, edit and rerun a message, search your threads, export an answer and let one thread draw on another.',
    [FeatureCapability.READ_ALOUD]:
      'Listen to any answer instead of reading it, with playback that starts after the first short part is ready.',
    [FeatureCapability.IMAGE_GENERATION]:
      'Generate and edit images inside the conversation, across several image providers with automatic fallback between them.',
    [FeatureCapability.RELIABILITY]:
      'Automatic fallback to another model, a shared breaker for providers that run out of credit, and streams that survive a reconnect.',
    [FeatureCapability.PAY_AS_YOU_GO_CREDIT]:
      'A monthly credit grant from your plan plus top-ups that never expire, reserved before every call and shown in your own currency.',
    [FeatureCapability.ADMINISTRATION_AND_ACCESS]:
      'Roles you can reshape, user and plan management, and a filterable audit log for whoever runs ClawAI for an organisation.',
  },
  capabilities: {
    [FeatureCapability.MULTIMODAL_AI]: {
      seo: {
        title: 'Multimodal AI in ClawAI: voice, video and vision',
        description:
          'How ClawAI handles voice notes, video notes and images: transcription, sampled video frames, a vision helper for text-only models, and routing by attachment type.',
        keywords: ['AI voice notes', 'AI video understanding', 'multimodal AI routing'],
      },
      eyebrow: 'Feature',
      title: 'Multimodal AI: voice, video and vision',
      summary:
        'You can talk to ClawAI, show it a video, or hand it a picture, and the message still reaches a model that can make sense of it. Recording, transcription, frame sampling and a vision helper are shipped parts of the chat, not a separate app.',
      sections: [
        {
          id: 'voice-and-video-notes',
          heading: 'Voice and video notes from the composer',
          paragraphs: [
            'The composer has a record button for voice and video notes. It asks for permission first, shows a live waveform while you record, and caps one recording at five minutes. The recording is transcribed — Gemini is tried first and OpenAI Whisper is the fallback — and the answering model is told the message arrived as a voice note, so it replies to what you said rather than to a file.',
            'Audio you already have works the same way: WebM, OGG, MP3, MP4 and M4A, WAV, FLAC and AAC uploads are transcribed before they reach the model.',
          ],
        },
        {
          id: 'video-understanding',
          heading: 'Video the model can actually follow',
          paragraphs: [
            'An uploaded video is transcribed with timestamps, and up to six frames per video are sampled and shown to the model alongside the transcript, so it can answer questions about what happens on screen as well as what is said. A silent video is reported as having no speech instead of producing an empty transcript, and you can stop processing a long video at any point.',
            'Every plan has a video-length allowance set by the operator; independent of plan, one video can never exceed thirty minutes or 4K resolution. Supported containers are MP4, MOV, WebM, AVI and MPEG.',
          ],
        },
        {
          id: 'vision-helper-and-modality-routing',
          heading: 'A vision helper, and routing by attachment type',
          paragraphs: [
            'Not every model can see. When the model answering a message is text-only, a second model can describe up to four images for it, including any text in them, and the answering model is told it is working from a description. In Local-Only and privacy-first conversations, only local helpers served through Ollama or llama.cpp are used.',
            'In Auto mode, the router also ranks candidate models by how well they handle the kind of attachment in the message, so an image, a PDF or a video tends to land on a model that accepts it natively rather than relying on the helper.',
          ],
        },
      ],
      faq: [
        {
          question: 'How long can a voice or video note be?',
          answer:
            'One recording made in the composer can run for up to five minutes. Uploaded videos are limited by your plan’s video-length allowance, and never beyond thirty minutes or 4K resolution on any plan.',
        },
        {
          question: 'What happens if I send an image to a model that cannot see images?',
          answer:
            'If the vision helper is enabled on your plan, a vision-capable model describes the image and transcribes its text, and the answering model works from that description, knowing it is a description rather than the image itself.',
        },
        {
          question: 'Does ClawAI pick a different model because of my attachment?',
          answer:
            'In Auto mode, yes: the router ranks candidates by how well they handle the attachment type. If you pin a model yourself, your choice is kept and the vision helper fills the gap where it is enabled.',
        },
      ],
      productNote:
        'Voice and video notes, transcription and modality-aware routing are shipped; the vision helper is a plan feature that an operator switches on by assigning a helper model.',
    },
    [FeatureCapability.FILES_FROM_CHAT]: {
      seo: {
        title: 'Files from chat: PDF, DOCX, XLSX, PPTX and ZIP',
        description:
          'Ask ClawAI for a document, spreadsheet, slide deck or archive in plain language and download a real file in one of ten formats, named and summarised by the model.',
        keywords: ['AI generate PDF', 'AI create spreadsheet', 'AI PowerPoint generator'],
      },
      eyebrow: 'Feature',
      title: 'Files from chat',
      summary:
        'Say “make this a PDF” or “put that in a spreadsheet” and ClawAI hands you a file, not a block of text to copy. The model writes the content, a format adapter builds the file, and the result sits in the conversation ready to download.',
      sections: [
        {
          id: 'ten-formats-from-plain-language',
          heading: 'Ten file formats from a plain-language request',
          paragraphs: [
            'A request such as “create a PDF of this plan” or “export the table as CSV” is recognised and sent to file generation. The supported formats are PDF, DOCX, XLSX, PPTX, ZIP, HTML, Markdown, plain text, CSV and JSON — each built by its own adapter, so a spreadsheet has real cells and a slide deck has real slides rather than one long page.',
          ],
        },
        {
          id: 'named-by-the-model',
          heading: 'Named and summarised by the model that wrote it',
          paragraphs: [
            'Instead of “document (3).pdf”, the model gives each file a descriptive title of up to 120 characters and a one-sentence summary, which appear on the file card in the chat. Titles in Arabic, Chinese, Hindi or any other script are kept as written rather than transliterated.',
            'Separately, any single answer can be exported with one click as Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX or ZIP. Those exports convert an answer you already have, so they never count against your daily file allowance.',
          ],
        },
        {
          id: 'downloads-and-allowances',
          heading: 'Private downloads, and a daily allowance on every plan',
          paragraphs: [
            'Only the person who created a file can download it, through an authenticated link. The download stays available for one hour; after that you can rebuild the same file for free, or ask the model to regenerate it with fresh content.',
            'Every plan, including Free, has a daily allowance of AI-written files set by the operator, and higher tiers raise it or remove the cap. Your normal usage allowance also applies to the writing itself, and whichever limit is reached first applies.',
          ],
        },
      ],
      faq: [
        {
          question: 'Which file formats can ClawAI create?',
          answer:
            'Ten: PDF, DOCX, XLSX, PPTX, ZIP, HTML, Markdown, plain text, CSV and JSON. Answer export covers eight of them — Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX and ZIP.',
        },
        {
          question: 'Why did my download link stop working?',
          answer:
            'Generated files stay downloadable for one hour. After that, open the file card and rebuild it — the same content, at no cost — or ask the model to regenerate it if you want it rewritten.',
        },
        {
          question: 'Is there a limit on how many files I can generate?',
          answer:
            'Yes, a daily allowance per plan that the operator sets, and it is available on Free as well. Exporting an answer you already have does not count toward it.',
        },
      ],
      productNote:
        'File generation is its own service with one adapter per format and its own metered surface (FILE_GENERATION), separate from ordinary chat usage.',
    },
    [FeatureCapability.SMART_ATTACHMENTS]: {
      seo: {
        title: 'Smart attachments: archives, media and virus scanning',
        description:
          'What happens when you attach a file in ClawAI: fifty supported types, archives unpacked into a readable tree, resumable uploads and an antivirus scan that fails closed.',
        keywords: ['AI chat file attachments', 'upload zip to AI', 'AI archive reader'],
      },
      eyebrow: 'Feature',
      title: 'Smart attachments',
      summary:
        'An attachment is only useful if the model can read it. ClawAI extracts the text from documents and archives before a model sees them, scans every upload for malware, and lets you drop files anywhere in the chat rather than hunting for a button.',
      sections: [
        {
          id: 'what-you-can-attach',
          heading: 'What you can attach, and how much',
          paragraphs: [
            'Documents (PDF, DOCX, XLSX, PPTX, RTF), around forty text and code formats, images (PNG, JPEG, WebP, GIF, SVG), audio, video, and archives (ZIP, 7z, RAR, TAR, GZ, BZ2, XZ). Each file can be up to 50 MB and a message can carry up to ten. Files over 4 MB upload in resumable chunks, so a dropped connection does not mean starting again.',
            'You can drop files anywhere in the chat panel — onto the messages or the composer — and each attachment shows a status chip while it uploads, with a cancel button if you change your mind.',
          ],
        },
        {
          id: 'text-extraction-and-archives',
          heading: 'Text extraction, and archives the model can navigate',
          paragraphs: [
            'The readable text of PDF, Office and RTF files is extracted and handed to the model, so it answers from the document itself rather than a placeholder. An archive is unpacked into a file tree plus the text of each member, so you can attach a zipped project and ask about a specific file inside it.',
            'Archives are checked before they are unpacked: limits on total unpacked size, entry count and nesting depth stop a decompression bomb from ever reaching the extractor.',
          ],
        },
        {
          id: 'scanning-and-retention',
          heading: 'Virus scanning that fails closed, and retention',
          paragraphs: [
            'Every upload is scanned by ClamAV before it is stored. If the scanner is unavailable, the upload is refused rather than let through unscanned. Uploads are deleted automatically after the retention period the operator configures, and you can delete a file yourself at any time.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can I upload a whole project as a ZIP file?',
          answer:
            'Yes. ZIP, 7z, RAR, TAR, GZ, BZ2 and XZ archives are unpacked into a file tree with each member’s text, so the model can find and quote a specific file inside the archive.',
        },
        {
          question: 'What is the maximum attachment size?',
          answer:
            '50 MB per file and up to ten attachments per message. Files over 4 MB upload in resumable chunks, so an interrupted connection resumes instead of starting over.',
        },
        {
          question: 'What happens if the virus scanner is down?',
          answer:
            'The upload is refused. ClawAI never stores an unscanned file as a fallback — you see an error and can try again once scanning is back.',
        },
      ],
      productNote:
        'Attachment handling lives in the file service: extraction, archive manifests, chunked uploads and ClamAV scanning are all on by default, not optional add-ons.',
    },
    [FeatureCapability.NARRATED_RESEARCH]: {
      seo: {
        title: 'Narrated research and web crawling in ClawAI',
        description:
          'How ClawAI researches the web: a planner that chooses to search or crawl, a live narrated work log, tiered fetching that respects robots.txt, and cited sources.',
        keywords: ['AI web research', 'AI website crawler', 'AI research with sources'],
      },
      eyebrow: 'Feature',
      title: 'Narrated research and web crawling',
      summary:
        'When a question needs the live web, ClawAI does not guess. A planner decides whether to answer directly, search, crawl a site or both, narrates each step while it works, and returns the answer with the sources it actually read.',
      sections: [
        {
          id: 'a-planner-not-a-keyword',
          heading: 'A planner decides, not a keyword',
          paragraphs: [
            'In Auto research mode, a planning model reads the message and chooses one of four paths: answer from what it already knows, search the web, crawl a specific site, or crawl and then search. A link you paste is always opened. If the planning model returns something unusable, the next model is tried rather than the research silently stopping.',
            'You can also pick the mode yourself in the composer: off, Auto, search only, search and fetch pages, or search and extract structured content.',
          ],
        },
        {
          id: 'a-narrated-work-log',
          heading: 'A work log you can watch',
          paragraphs: [
            'Each step — the plan, every search, every page fetched or skipped — is streamed into a narrated log above the answer as it happens, and saved with the answer so it is still there after a refresh. The sources the answer drew on are listed with it, so you can open and check them yourself.',
          ],
        },
        {
          id: 'tiered-and-polite-fetching',
          heading: 'Tiered fetching that follows the rules',
          paragraphs: [
            'Pages are fetched cheapest first: a site’s official API where one exists, then a plain HTTP request, then escalation to a headless browser only when a page needs one, with a reader service and archive snapshots as later fallbacks. A crawl can cover up to two hundred pages of one site.',
            'robots.txt is honoured on every fetch under the ClawAI-ResearchBot user agent, and a disallowed page is not retried another way. Sign-in walls and legal blocks stop the fetch, captchas are never solved, every redirect is checked against private network addresses, and an archived copy is always labelled as one.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does ClawAI respect robots.txt?',
          answer:
            'Yes, on every fetch, under the ClawAI-ResearchBot user agent. A page robots.txt disallows is skipped and not retried through another fetching method.',
        },
        {
          question: 'Can I see what the research actually did?',
          answer:
            'Yes. A narrated work log shows the plan, each search and each page fetched or skipped, and it is saved with the answer along with the list of sources it used.',
        },
        {
          question: 'Is web research available on every plan?',
          answer:
            'Research modes are plan features (RESEARCH_MODE, WEB_SEARCH, WEB_FETCH and WEB_EXTRACT) with their own allowances, which the operator sets per plan. The pricing page shows what each plan includes.',
        },
      ],
      productNote:
        'The research loop runs in its own research service with admin-editable fetch tiers, metered on its own surfaces rather than as ordinary chat tokens.',
    },
    [FeatureCapability.ORCHESTRATION_LABS]: {
      seo: {
        title: 'Orchestration labs: compare, judge, consensus, escalation',
        description:
          'The ClawAI labs that put several models on one prompt — Compare with Judge and Critic, Consensus, Escalation, Best-of-N, Verify, Repair, Pipelines and more.',
        keywords: ['compare AI models side by side', 'AI consensus answer', 'LLM judge'],
      },
      eyebrow: 'Feature',
      title: 'Orchestration labs',
      summary:
        'Some questions deserve more than one model. The labs are dedicated workspaces, each with its own page and result view, for running several models on one problem and seeing exactly how they differ.',
      sections: [
        {
          id: 'compare-judge-and-critic',
          heading: 'Compare, with a judge and a critic',
          paragraphs: [
            'Compare sends one prompt to several models and shows their answers side by side with latency and token counts. Switch on Judge and an independent model scores each answer against explicit criteria; switch on Critic and it writes down what is weak in each. Compare also runs inside an ordinary thread, so you can check a single answer without leaving the conversation.',
          ],
        },
        {
          id: 'consensus-and-escalation',
          heading: 'Consensus and escalation',
          paragraphs: [
            'Consensus asks two to five models the same question and synthesises one answer from where they agree, flagging where they do not. Escalation starts with an inexpensive model and moves up the chain only when the answer falls short, so you pay for a strong model when the question actually needs one.',
          ],
        },
        {
          id: 'the-other-labs',
          heading: 'Verify, repair, and the rest of the bench',
          paragraphs: [
            'Best-of-N generates several candidates and keeps the strongest. Verify has a second model check an answer for correctness. Repair fixes a specific defect in an existing answer instead of regenerating it. Decompose splits a large task into steps. Role packs hand a problem between role-specialised models, Cost ensemble balances quality against spend, and Pipelines chain several stages into one named, re-runnable workflow.',
            'Each lab is enabled per plan by the operator, and lab runs are metered separately from ordinary chat — Compare, Judge and Critic on their own surfaces, the other labs on the orchestration surface.',
          ],
        },
      ],
      faq: [
        {
          question: 'What is the difference between Compare and Consensus?',
          answer:
            'Compare shows every model’s answer side by side and leaves the verdict to you, optionally with a Judge score. Consensus merges the answers into one and flags the points where the models disagree.',
        },
        {
          question: 'How does escalation save money?',
          answer:
            'It starts with a cheaper model and only moves to a stronger one when the answer does not meet the bar, so easy questions never pay for the most expensive model.',
        },
        {
          question: 'Are the labs on every plan?',
          answer:
            'Each lab is switched on per plan by the operator, so availability depends on your plan. The pricing page lists what each plan includes.',
        },
      ],
      productNote:
        'Compare, Consensus, Escalation, Repair, Decompose, Best-of-N, Verify, Pipeline, Cost ensemble and Role pack are each shipped with their own page, endpoint and result card.',
    },
    [FeatureCapability.CONVERSATION_TOOLS]: {
      seo: {
        title: 'Conversation power tools: branch, edit, search, export',
        description:
          'The ClawAI tools for working with a conversation rather than just reading it: branching, edit and rerun, find in thread, cross-thread search, export and shared links.',
        keywords: ['branch AI conversation', 'edit and rerun prompt', 'export AI chat'],
      },
      eyebrow: 'Feature',
      title: 'Conversation power tools',
      summary:
        'A long conversation is a working document. ClawAI gives you the tools to fork it, correct it, search it, reuse it in another thread and hand it to someone else, without copying and pasting.',
      sections: [
        {
          id: 'branch-edit-and-rerun',
          heading: 'Branch, edit and rerun',
          paragraphs: [
            'Branch a conversation from any message to try a different direction while keeping the original intact. Edit one of your earlier messages and rerun it, or regenerate an answer you are not happy with, and the thread continues from the new version.',
          ],
        },
        {
          id: 'find-search-and-cross-thread-context',
          heading: 'Find, search, and context from other threads',
          paragraphs: [
            'Search inside the current thread, or across all your threads by title and message text. Cross-thread context lets a conversation draw on your own relevant earlier threads — at most three, and only ever yours. It is on by default, can be switched off per thread, and the context inspector shows which threads were used.',
          ],
        },
        {
          id: 'export-pin-and-share',
          heading: 'Export, pin and share',
          paragraphs: [
            'Export a whole thread as Markdown, or a single answer as Markdown, TXT, HTML, DOCX, PDF, XLSX, PPTX or ZIP. Pin the threads you come back to. Share a conversation through a public link that you can refresh to a new URL or revoke at any time.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does branching change the original conversation?',
          answer:
            'No. A branch is a new thread that starts from the message you chose; the original conversation stays exactly as it was.',
        },
        {
          question:
            'Can another person’s conversation leak into mine through cross-thread context?',
          answer:
            'No. Cross-thread context only reads your own threads, at most three of them, and you can switch it off for any thread in its settings.',
        },
        {
          question: 'Can I stop sharing a conversation after I send the link?',
          answer:
            'Yes. You can revoke a shared link at any time, or refresh it to a new URL so the old one stops working.',
        },
      ],
      productNote:
        'Branching, edit and rerun, regeneration, in-thread and cross-thread search, export, pinning, sharing and cross-thread context are all shipped in the chat workspace.',
    },
    [FeatureCapability.READ_ALOUD]: {
      seo: {
        title: 'Read aloud: listen to AI answers in ClawAI',
        description:
          'How ClawAI reads an answer aloud with server-generated speech: playback that starts early, pause and stop controls, long-answer handling and no charge for failed parts.',
        keywords: ['AI read aloud', 'AI text to speech answers', 'listen to AI chat'],
      },
      eyebrow: 'Feature',
      title: 'Read aloud',
      summary:
        'Any answer can be listened to instead of read. Speech is generated on the server by a text-to-speech model, not by the browser’s built-in voice, and it starts playing before the whole answer has been converted.',
      sections: [
        {
          id: 'how-playback-works',
          heading: 'How playback works',
          paragraphs: [
            'Each assistant message has a Read aloud button with play, pause and stop. The answer is converted in parts, and playback starts as soon as the first short part is ready, so you are not waiting for a long answer to be processed in full before you hear anything.',
          ],
        },
        {
          id: 'long-answers-and-languages',
          heading: 'Long answers and other languages',
          paragraphs: [
            'Up to 12,000 characters of an answer are read, and you are told when an answer was longer than that and playback was cut short. Sentences are split correctly for Latin, Arabic, Hindi and Chinese, Japanese and Korean text, so a multilingual answer does not stumble at every full stop.',
          ],
        },
        {
          id: 'voices-and-billing',
          heading: 'Voices, availability and billing',
          paragraphs: [
            'Voices come from Gemini or OpenAI text-to-speech models, chosen by the operator. Read aloud is a plan feature; if no voice has been assigned, the button tells you so instead of failing silently. Parts that fail to generate are not charged.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does read aloud use my browser’s voice?',
          answer:
            'No. Speech is generated on the server by a Gemini or OpenAI text-to-speech model, so it sounds the same on every device and browser.',
        },
        {
          question: 'Can it read a very long answer?',
          answer:
            'It reads up to 12,000 characters of one answer and tells you when the answer was longer than that, so you know playback stopped early.',
        },
        {
          question: 'Am I charged if read aloud fails?',
          answer:
            'Only for the parts that were actually generated. A part that fails is not charged, and you can play the answer again.',
        },
      ],
      productNote:
        'Read aloud is a plan feature that uses a server-side text-to-speech model the operator assigns; it is not the browser speech engine.',
    },
    [FeatureCapability.IMAGE_GENERATION]: {
      seo: {
        title: 'AI image generation inside ClawAI conversations',
        description:
          'Generate and edit images from a ClawAI conversation using Gemini, OpenAI, xAI or local Stable Diffusion models, with provider fallback, progress and retry built in.',
        keywords: ['AI image generator', 'edit image with AI', 'Gemini image generation'],
      },
      eyebrow: 'Feature',
      title: 'Image generation',
      summary:
        'Describe an image in the conversation and ClawAI generates it there, next to the rest of the work. Several image providers sit behind one request, and if one fails the next is tried automatically.',
      sections: [
        {
          id: 'providers-and-fallback',
          heading: 'Several providers behind one request',
          paragraphs: [
            'Image requests can be served by Gemini image models, OpenAI’s gpt-image-1, xAI’s Grok Imagine, or local Stable Diffusion models (SDXL-Turbo and a ComfyUI workflow) running on your own hardware. If the provider that was chosen fails, the request moves to the next one — cloud first, then local — instead of returning an error.',
            'If you pick a specific image model yourself, that model is used, even when the prompt does not contain an obvious image keyword.',
          ],
        },
        {
          id: 'in-the-conversation',
          heading: 'Generated in the conversation, with progress',
          paragraphs: [
            'Images appear inside the chat with a progress panel while they are generated. You can cancel a generation, or retry with a different provider if you do not like the result. There is no separate image app to switch to.',
          ],
        },
        {
          id: 'prompts-sizes-and-edits',
          heading: 'Prompts, sizes and edits',
          paragraphs: [
            'Prompts can be up to 4,000 characters, and images can be requested at sizes from 256 to 4,096 pixels. Attach a reference image of up to 25 MB to edit an existing picture rather than start from scratch. Image generation is a paid-plan feature and is metered on its own surface, separate from chat tokens.',
          ],
        },
      ],
      faq: [
        {
          question: 'Which models generate the images?',
          answer:
            'Gemini image models, OpenAI’s gpt-image-1, xAI’s Grok Imagine, and local Stable Diffusion models. Which of them are available depends on what the operator has configured.',
        },
        {
          question: 'Can I edit an image I already have?',
          answer:
            'Yes. Attach a reference image of up to 25 MB and describe the change you want, and the model edits it instead of generating from scratch.',
        },
        {
          question: 'Is image generation available on the free plan?',
          answer:
            'Image generation is a paid-plan feature and is metered separately from chat. The pricing page shows which plans include it.',
        },
      ],
      productNote:
        'Image generation runs in its own image service with provider fallback from cloud to local models, metered on the IMAGE surface.',
    },
    [FeatureCapability.RELIABILITY]: {
      seo: {
        title: 'Reliability in ClawAI: fallback, breakers and resumable streams',
        description:
          'What ClawAI does when a provider fails: automatic fallback to another model, a shared breaker for exhausted provider accounts, and streams that resume after a reconnect.',
        keywords: ['AI model fallback', 'LLM provider failover', 'resumable AI streaming'],
      },
      eyebrow: 'Feature',
      title: 'Reliability',
      summary:
        'Providers fail, run out of credit and time out. ClawAI is built so that when one does, your conversation carries on with another model and an interrupted stream picks up where it left off.',
      sections: [
        {
          id: 'automatic-fallback',
          heading: 'Automatic fallback to another model',
          paragraphs: [
            'Every routed request carries a list of candidate models. If the chosen model fails mid-request, ClawAI moves to the next candidate automatically, and the answer records which model actually responded, not only the one first chosen.',
          ],
        },
        {
          id: 'a-shared-provider-breaker',
          heading: 'A shared breaker for exhausted providers',
          paragraphs: [
            'When a provider account runs out of credit, a breaker takes that provider out of rotation for ten minutes, then lets a single test call through to see whether it has recovered. The breaker’s state is shared in Redis across every chat server, so one failure is learned once rather than rediscovered by each server, and each server falls back to its own copy if Redis is unavailable.',
          ],
        },
        {
          id: 'stop-and-resume',
          heading: 'Stop that always stops, streams that resume',
          paragraphs: [
            'Pressing Stop is broadcast to every chat server, so whichever one is running the model aborts it. If your connection drops while an answer is streaming, reconnecting replays the events you missed from a buffer instead of losing the rest of the answer.',
          ],
        },
      ],
      faq: [
        {
          question: 'What happens if a model fails halfway through an answer?',
          answer:
            'ClawAI falls back to the next candidate model automatically, and the answer shows which model actually produced it.',
        },
        {
          question: 'What does the provider breaker protect against?',
          answer:
            'A provider account that has run out of credit. It is skipped for ten minutes and then tested with one call, instead of every request failing against it in the meantime.',
        },
        {
          question: 'Do I lose an answer if my connection drops?',
          answer:
            'No. When the stream reconnects, the events you missed are replayed from a server-side buffer and the answer continues.',
        },
      ],
      productNote:
        'Fallback, the Redis-shared provider breaker, cross-server Stop and resumable streams are all in the chat service today; operators see breaker state on the admin connectors page.',
    },
    [FeatureCapability.PAY_AS_YOU_GO_CREDIT]: {
      seo: {
        title: 'Pay-as-you-go AI credit and local-currency prices',
        description:
          'How ClawAI’s pay-as-you-go credit works: a monthly grant from your plan, top-ups that never expire, spend reserved before each call, and prices shown in your currency.',
        keywords: ['pay as you go AI', 'AI credit top-up', 'AI pricing in local currency'],
      },
      eyebrow: 'Feature',
      title: 'Pay-as-you-go credit and local currency',
      summary:
        'Cloud models cost real money per token, so ClawAI meters them against a credit wallet instead of hiding the cost inside a flat fee. You see what each feature spent, top up only when you need to, and read prices in your own currency.',
      sections: [
        {
          id: 'two-kinds-of-credit',
          heading: 'Two kinds of credit, spent in a fixed order',
          paragraphs: [
            'The wallet holds two kinds of credit. The monthly grant is a share of your paid plan’s price that resets each billing period and does not roll over; a free plan grants none. Purchased credit comes from top-ups, never expires, and stays yours through a downgrade or a cancellation.',
            'Spending always takes the monthly grant first and purchased credit second, so a top-up is only touched once the grant for the period is used up. Anyone can buy a top-up, including on the free plan, and top-up packages and plan prices come from versioned price records rather than from this page.',
          ],
        },
        {
          id: 'no-surprise-spend',
          heading: 'Spend is reserved before a call, never after',
          paragraphs: [
            'Before a cloud model runs, the cost of the request is reserved against your balance; afterwards the reservation is settled at the real figure or released. You cannot spend past your balance, and if what is left would not cover a useful answer, the request is refused rather than cut off halfway. A model with no published price is blocked instead of being treated as free.',
            'Credit covers chat, Compare, Judge, the orchestration labs, image and file generation, the coding agent, workspace actions, transcription, the vision helper and read aloud. Local models served through Ollama or llama.cpp are not metered, and web research uses its own separate allowances.',
          ],
        },
        {
          id: 'ledger-and-local-currency',
          heading: 'A ledger by feature, and prices in your currency',
          paragraphs: [
            'Every movement is written to an append-only ledger in whole micro-dollars — no rounding drift — and the billing page shows which feature spent each amount, so a busy week of image generation is visible as exactly that.',
            'Prices are shown in more than sixty display currencies, detected from your location or picked by hand, with the original US-dollar amount alongside. The displayed figure is an estimate; you are charged in the currency shown at checkout, at a rate fixed when you pay, through the payment gateways the operator has enabled — PayPal and Paymob today.',
          ],
        },
      ],
      faq: [
        {
          question: 'Does unused credit roll over?',
          answer:
            'The monthly grant does not — it resets each billing period. Credit you bought as a top-up never expires and survives a downgrade or cancellation.',
        },
        {
          question: 'Can a long conversation overspend my balance?',
          answer:
            'No. The cost is reserved before the model runs, and a request that your remaining balance cannot cover is refused up front rather than billed afterwards.',
        },
        {
          question: 'Why does the price at checkout differ slightly from the one I saw?',
          answer:
            'The local-currency price on the site is an estimate converted from US dollars. The charge uses the currency shown at checkout and an exchange rate fixed at the moment you pay.',
        },
      ],
      productNote:
        'Pay-as-you-go credit is a wallet with an append-only micro-dollar ledger, switched on per deployment by its operator; plan prices and top-up packages always come from versioned price records.',
    },
    [FeatureCapability.ADMINISTRATION_AND_ACCESS]: {
      seo: {
        title: 'Administration and access control in ClawAI',
        description:
          'What an operator gets when running ClawAI for an organisation: role-based permissions, custom roles, user management, plan and gateway settings, and a filterable audit log.',
        keywords: ['AI admin console', 'AI role based access control', 'AI audit log'],
      },
      eyebrow: 'Feature',
      title: 'Administration and access control',
      summary:
        'Running ClawAI for a group of people — a company, a department, a lab — means deciding who can do what and being able to check what happened. The admin console covers users, roles, plans, payments and an audit trail, and it is the same console whether ClawAI is hosted for you or runs on your own servers.',
      sections: [
        {
          id: 'roles-and-permissions',
          heading: 'Roles and permissions you can reshape',
          paragraphs: [
            'Every account has a role, and every screen and API action checks a named permission rather than a hard-coded role. Administrators can change which permissions a role carries and create new roles of their own, so a read-only reviewer or a billing-only operator is a configuration change, not a code change.',
          ],
        },
        {
          id: 'users-plans-and-payments',
          heading: 'Users, plans and payments',
          paragraphs: [
            'Administrators can activate or deactivate accounts, change a user’s role, set a temporary password that must be changed at the next sign-in, and see an individual user’s usage and plan. Plans, refunds, payment gateways, the smart router’s settings, webhook deliveries and deployment details each have their own admin screen.',
          ],
        },
        {
          id: 'audit-and-self-hosting',
          heading: 'An audit log, and your own infrastructure if you need it',
          paragraphs: [
            'Security-relevant actions are written to an audit log that administrators can filter and review, and audit records are kept rather than expired on the ordinary log schedule. Organisations that cannot send data to a third-party provider can run the whole platform on their own servers with local models only; that is a scoped deployment rather than a self-serve plan.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can I create my own roles?',
          answer:
            'Yes. Administrators can create roles and choose which permissions each role carries; every screen and API action checks a named permission, not a fixed role.',
        },
        {
          question: 'Does ClawAI have team workspaces, seats or single sign-on?',
          answer:
            'Not yet. There are no shared team workspaces, per-seat billing, email invitations or single sign-on today. Administration is per deployment: an operator manages users, roles and plans from the admin console.',
        },
        {
          question: 'Can we run ClawAI inside our own network?',
          answer:
            'Yes, as a scoped deployment on your own servers with local models only, so no prompt or document leaves your infrastructure. The private-deployment page describes what that involves.',
        },
      ],
      productNote:
        'Role-based permissions, custom roles, user management and the audit log are shipped in the admin console; team workspaces, seat billing, invitations and single sign-on are not.',
    },
  },
};
