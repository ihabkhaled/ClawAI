import { RouterProvider } from '../../../generated/prisma';
import { ComplexityClass } from '../../../common/enums/complexity-class.enum';
import { CloudRouterPromptManager } from '../managers/cloud-router-prompt.manager';
import { type EligibleDeploymentRecord } from '../types/model-deployment.types';
import { type RoutingContext } from '../types/routing.types';

const eligible: EligibleDeploymentRecord[] = [
  { id: 'dep_1', provider: RouterProvider.GEMINI, providerModelId: 'gemini-2.5-flash' },
  { id: 'dep_2', provider: RouterProvider.OLLAMA_CLOUD, providerModelId: 'qwen3:32b' },
];

const baseContext: RoutingContext = { message: 'Summarize this quarterly report.' };

describe('CloudRouterPromptManager.buildPrompt', () => {
  it('lists every eligible deployment id so the model cannot select one outside the set', () => {
    const manager = new CloudRouterPromptManager();

    const prompt = manager.buildPrompt(baseContext, eligible);

    expect(prompt).toContain('dep_1');
    expect(prompt).toContain('dep_2');
  });

  it('states the required JSON shape the coordinator will validate against', () => {
    const manager = new CloudRouterPromptManager();

    const prompt = manager.buildPrompt(baseContext, eligible);

    expect(prompt).toContain('"deploymentId"');
    expect(prompt).toContain('"workflow"');
    expect(prompt).toContain('"confidence"');
    expect(prompt).toContain('"reasonCodes"');
  });

  it('includes the user message', () => {
    const manager = new CloudRouterPromptManager();

    const prompt = manager.buildPrompt(baseContext, eligible);

    expect(prompt).toContain('Summarize this quarterly report.');
  });

  it('includes the complexity class when the context carries one', () => {
    const manager = new CloudRouterPromptManager();
    const context: RoutingContext = {
      ...baseContext,
      complexity: { class: ComplexityClass.EXPERT, score: 1, wordCount: 600, factors: [] },
    };

    const prompt = manager.buildPrompt(context, eligible);

    expect(prompt).toContain(ComplexityClass.EXPERT);
  });

  it('omits a complexity line entirely when the context carries none', () => {
    const manager = new CloudRouterPromptManager();

    const prompt = manager.buildPrompt(baseContext, eligible);

    expect(prompt).not.toContain('Message complexity');
  });

  it('produces an empty deployment list section rather than throwing when nothing is eligible', () => {
    const manager = new CloudRouterPromptManager();

    expect(() => manager.buildPrompt(baseContext, [])).not.toThrow();
  });
});
