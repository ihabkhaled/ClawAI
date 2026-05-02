/**
 * Seed for FrontierCatalogEntry — 9 canonical frontier open-weight models.
 * Idempotent: re-running upserts on (name, tag).
 *
 * Run via:
 *   cd apps/claw-llamacpp-service && npm run seed:catalog
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

interface SeedEntry {
  name: string;
  tag: string;
  displayName: string;
  category: 'CODING' | 'REASONING' | 'THINKING' | 'GENERAL' | 'FILE_GENERATION';
  description: string;
  parameterCount: string;
  totalParamsB: number;
  activeParamsB: number;
  contextLength: number;
  capabilities: string[];
  license: string;
  huggingfaceRepo: string;
  filePattern: string;
  fileSizeBytes: bigint;
  requiredRamGb: number;
  recommendedRamGb: number;
  requiredDiskGb: number;
  recommendedGpuVramGb: number;
  isRecommended: boolean;
  qualityTier: 'SURVIVAL' | 'BALANCED' | 'BEST';
  sourceUrl: string;
  chatTemplate: string | null;
}

const ENTRIES: SeedEntry[] = [
  // ─── Dev-class entries ───────────────────────────────────────────────────
  // These three fit on consumer dev boxes (8–24 GB VRAM, 16–64 GB RAM).
  // They exist so contributors can validate the full pull → load → inference
  // pipeline end-to-end without renting an H100.
  {
    name: 'qwen3-coder',
    tag: 'Q4_K_M',
    displayName: 'Qwen3-Coder 7B (Q4_K_M, dev-class)',
    category: 'CODING',
    description:
      'Compact 7B coding model from Alibaba. Validates the pipeline on entry-level GPUs (~6 GB VRAM).',
    parameterCount: '7B',
    totalParamsB: 7,
    activeParamsB: 7,
    contextLength: 32_768,
    capabilities: ['code_generation'],
    license: 'Apache-2.0',
    huggingfaceRepo: 'unsloth/Qwen3-Coder-7B-GGUF',
    filePattern: '*Q4_K_M*.gguf',
    fileSizeBytes: 5n * 1_073_741_824n,
    requiredRamGb: 8,
    recommendedRamGb: 16,
    requiredDiskGb: 8,
    recommendedGpuVramGb: 6,
    isRecommended: true,
    qualityTier: 'BALANCED',
    sourceUrl: 'https://huggingface.co/unsloth/Qwen3-Coder-7B-GGUF',
    chatTemplate: null,
  },
  {
    name: 'phi-4-mini',
    tag: 'Q4_K_M',
    displayName: 'Phi-4-mini 3.8B (Q4_K_M, dev-class)',
    category: 'GENERAL',
    description:
      'Microsoft Phi-4-mini at Q4. Smallest end-to-end frontier validator: ~2 GB on disk, runs on iGPUs / 4 GB VRAM.',
    parameterCount: '3.8B',
    totalParamsB: 4,
    activeParamsB: 4,
    contextLength: 128_000,
    capabilities: ['reasoning', 'tools'],
    license: 'MIT',
    huggingfaceRepo: 'unsloth/Phi-4-mini-instruct-GGUF',
    filePattern: '*Q4_K_M*.gguf',
    fileSizeBytes: 2n * 1_073_741_824n,
    requiredRamGb: 6,
    recommendedRamGb: 12,
    requiredDiskGb: 4,
    recommendedGpuVramGb: 4,
    isRecommended: true,
    qualityTier: 'SURVIVAL',
    sourceUrl: 'https://huggingface.co/unsloth/Phi-4-mini-instruct-GGUF',
    chatTemplate: null,
  },
  {
    name: 'llama-3.3',
    tag: '70b-IQ2_XS',
    displayName: 'Llama 3.3 70B (IQ2_XS, dev-class)',
    category: 'REASONING',
    description:
      'Llama 3.3 70B at IQ2_XS — fits 24 GB VRAM with offload. Bridge between dev-class and frontier-class entries.',
    parameterCount: '70B',
    totalParamsB: 70,
    activeParamsB: 70,
    contextLength: 128_000,
    capabilities: ['reasoning', 'code_generation', 'tools'],
    license: 'Llama 3.3 Community',
    huggingfaceRepo: 'unsloth/Llama-3.3-70B-Instruct-GGUF',
    filePattern: '*IQ2_XS*.gguf',
    fileSizeBytes: 22n * 1_073_741_824n,
    requiredRamGb: 32,
    recommendedRamGb: 64,
    requiredDiskGb: 30,
    recommendedGpuVramGb: 24,
    isRecommended: true,
    qualityTier: 'SURVIVAL',
    sourceUrl: 'https://huggingface.co/unsloth/Llama-3.3-70B-Instruct-GGUF',
    chatTemplate: null,
  },
  // ─── Frontier-class entries (production hardware required) ────────────────
  {
    name: 'kimi-k2.6',
    tag: 'Q4_K_M',
    displayName: 'Kimi K2.6 (Q4_K_M)',
    category: 'CODING',
    description: '1T MoE coding/reasoning model from Moonshot. Q4 quant, balanced quality/size.',
    parameterCount: '1T (32B active)',
    totalParamsB: 1000,
    activeParamsB: 32,
    contextLength: 256_000,
    capabilities: ['code_generation', 'reasoning', 'tools', 'large_context'],
    license: 'Modified MIT',
    huggingfaceRepo: 'unsloth/Kimi-K2.6-GGUF',
    filePattern: '*Q4_K_M*.gguf',
    fileSizeBytes: 540n * 1_073_741_824n,
    requiredRamGb: 256,
    recommendedRamGb: 384,
    requiredDiskGb: 567,
    recommendedGpuVramGb: 24,
    isRecommended: false,
    qualityTier: 'BALANCED',
    sourceUrl: 'https://huggingface.co/unsloth/Kimi-K2.6-GGUF',
    chatTemplate: null,
  },
  {
    name: 'kimi-k2.6',
    tag: 'UD-Q2_K_XL',
    displayName: 'Kimi K2.6 (Survival UD-Q2_K_XL)',
    category: 'CODING',
    description: 'Survival-tier 2-bit quantization for resource-constrained workstations.',
    parameterCount: '1T (32B active)',
    totalParamsB: 1000,
    activeParamsB: 32,
    contextLength: 256_000,
    capabilities: ['code_generation', 'reasoning', 'tools'],
    license: 'Modified MIT',
    huggingfaceRepo: 'unsloth/Kimi-K2.6-GGUF',
    filePattern: '*UD-Q2_K_XL*.gguf',
    fileSizeBytes: 245n * 1_073_741_824n,
    requiredRamGb: 96,
    recommendedRamGb: 128,
    requiredDiskGb: 258,
    recommendedGpuVramGb: 24,
    isRecommended: false,
    qualityTier: 'SURVIVAL',
    sourceUrl: 'https://huggingface.co/unsloth/Kimi-K2.6-GGUF',
    chatTemplate: null,
  },
  {
    name: 'kimi-k2-thinking',
    tag: 'INT4',
    displayName: 'Kimi K2-Thinking (INT4)',
    category: 'THINKING',
    description: 'Long-form reasoning + agentic tool use. INT4 native quantization.',
    parameterCount: '1T (32B active)',
    totalParamsB: 1000,
    activeParamsB: 32,
    contextLength: 256_000,
    capabilities: ['thinking', 'reasoning', 'tools', 'agent', 'large_context'],
    license: 'Modified MIT',
    huggingfaceRepo: 'moonshotai/Kimi-K2-Thinking',
    filePattern: '*INT4*.gguf',
    fileSizeBytes: 500n * 1_073_741_824n,
    requiredRamGb: 256,
    recommendedRamGb: 384,
    requiredDiskGb: 525,
    recommendedGpuVramGb: 24,
    isRecommended: true,
    qualityTier: 'BALANCED',
    sourceUrl: 'https://huggingface.co/moonshotai/Kimi-K2-Thinking',
    chatTemplate: null,
  },
  {
    name: 'glm-5.1',
    tag: 'Q4_K_M',
    displayName: 'GLM-5.1 (Q4_K_M)',
    category: 'THINKING',
    description: '754B MoE thinking model from Zhipu. Excellent reasoning + tool use.',
    parameterCount: '754B (37B active)',
    totalParamsB: 754,
    activeParamsB: 37,
    contextLength: 200_000,
    capabilities: ['thinking', 'reasoning', 'tools', 'multilingual'],
    license: 'MIT',
    huggingfaceRepo: 'unsloth/GLM-5.1-GGUF',
    filePattern: '*Q4_K_M*.gguf',
    fileSizeBytes: 400n * 1_073_741_824n,
    requiredRamGb: 192,
    recommendedRamGb: 256,
    requiredDiskGb: 420,
    recommendedGpuVramGb: 24,
    isRecommended: true,
    qualityTier: 'BALANCED',
    sourceUrl: 'https://huggingface.co/unsloth/GLM-5.1-GGUF',
    chatTemplate: null,
  },
  {
    name: 'glm-5.1',
    tag: 'UD-Q2_K_XL',
    displayName: 'GLM-5.1 (Survival UD-Q2_K_XL)',
    category: 'THINKING',
    description: 'Survival-tier 2-bit quant for 96GB workstations.',
    parameterCount: '754B (37B active)',
    totalParamsB: 754,
    activeParamsB: 37,
    contextLength: 200_000,
    capabilities: ['thinking', 'reasoning'],
    license: 'MIT',
    huggingfaceRepo: 'unsloth/GLM-5.1-GGUF',
    filePattern: '*UD-Q2_K_XL*.gguf',
    fileSizeBytes: 220n * 1_073_741_824n,
    requiredRamGb: 96,
    recommendedRamGb: 128,
    requiredDiskGb: 231,
    recommendedGpuVramGb: 24,
    isRecommended: false,
    qualityTier: 'SURVIVAL',
    sourceUrl: 'https://huggingface.co/unsloth/GLM-5.1-GGUF',
    chatTemplate: null,
  },
  {
    name: 'deepseek-v3.2',
    tag: 'Q4_K_M',
    displayName: 'DeepSeek V3.2 (Q4_K_M)',
    category: 'REASONING',
    description: '671B MoE reasoning model. Strong math + coding.',
    parameterCount: '671B (37B active)',
    totalParamsB: 671,
    activeParamsB: 37,
    contextLength: 128_000,
    capabilities: ['reasoning', 'math', 'code_generation', 'tools'],
    license: 'MIT',
    huggingfaceRepo: 'unsloth/DeepSeek-V3.2-GGUF',
    filePattern: '*Q4_K_M*.gguf',
    fileSizeBytes: 405n * 1_073_741_824n,
    requiredRamGb: 256,
    recommendedRamGb: 384,
    requiredDiskGb: 425,
    recommendedGpuVramGb: 24,
    isRecommended: true,
    qualityTier: 'BALANCED',
    sourceUrl: 'https://huggingface.co/unsloth/DeepSeek-V3.2-GGUF',
    chatTemplate: null,
  },
  {
    name: 'deepseek-v3.2',
    tag: 'UD-IQ1_M',
    displayName: 'DeepSeek V3.2 (Survival UD-IQ1_M)',
    category: 'REASONING',
    description: 'Survival-tier 1-bit quant. Lower fidelity but runs on 96 GB.',
    parameterCount: '671B (37B active)',
    totalParamsB: 671,
    activeParamsB: 37,
    contextLength: 128_000,
    capabilities: ['reasoning', 'math'],
    license: 'MIT',
    huggingfaceRepo: 'unsloth/DeepSeek-V3.2-GGUF',
    filePattern: '*UD-IQ1_M*.gguf',
    fileSizeBytes: 170n * 1_073_741_824n,
    requiredRamGb: 96,
    recommendedRamGb: 128,
    requiredDiskGb: 178,
    recommendedGpuVramGb: 24,
    isRecommended: false,
    qualityTier: 'SURVIVAL',
    sourceUrl: 'https://huggingface.co/unsloth/DeepSeek-V3.2-GGUF',
    chatTemplate: null,
  },
  {
    name: 'deepseek-v4-pro',
    tag: 'Q4_K_M',
    displayName: 'DeepSeek V4 Pro (Q4_K_M)',
    category: 'REASONING',
    description: 'Largest open-weight reasoning model. 1.4T total parameters.',
    parameterCount: '1.4T (40B active)',
    totalParamsB: 1400,
    activeParamsB: 40,
    contextLength: 256_000,
    capabilities: ['reasoning', 'math', 'code_generation', 'tools', 'large_context'],
    license: 'MIT',
    huggingfaceRepo: 'unsloth/DeepSeek-V4-Pro-GGUF',
    filePattern: '*Q4_K_M*.gguf',
    fileSizeBytes: 750n * 1_073_741_824n,
    requiredRamGb: 384,
    recommendedRamGb: 512,
    requiredDiskGb: 788,
    recommendedGpuVramGb: 24,
    isRecommended: false,
    qualityTier: 'BALANCED',
    sourceUrl: 'https://huggingface.co/unsloth/DeepSeek-V4-Pro-GGUF',
    chatTemplate: null,
  },
  {
    name: 'deepseek-v4-flash',
    tag: 'Q5_K_M',
    displayName: 'DeepSeek V4 Flash (Q5_K_M)',
    category: 'GENERAL',
    description: 'Compact, fast frontier model. 256B total / 14B active. 64 GB workstations.',
    parameterCount: '256B (14B active)',
    totalParamsB: 256,
    activeParamsB: 14,
    contextLength: 128_000,
    capabilities: ['general', 'code_generation', 'tools'],
    license: 'MIT',
    huggingfaceRepo: 'unsloth/DeepSeek-V4-Flash-GGUF',
    filePattern: '*Q5_K_M*.gguf',
    fileSizeBytes: 140n * 1_073_741_824n,
    requiredRamGb: 64,
    recommendedRamGb: 96,
    requiredDiskGb: 147,
    recommendedGpuVramGb: 24,
    isRecommended: false,
    qualityTier: 'BALANCED',
    sourceUrl: 'https://huggingface.co/unsloth/DeepSeek-V4-Flash-GGUF',
    chatTemplate: null,
  },
];

async function main(): Promise<void> {
  console.warn(`Seeding ${ENTRIES.length} frontier catalog entries...`);
  for (const entry of ENTRIES) {
    await prisma.frontierCatalogEntry.upsert({
      where: { name_tag: { name: entry.name, tag: entry.tag } },
      create: { ...entry },
      update: { ...entry },
    });
  }
  console.warn('Catalog seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
