import { RoutingManager } from '../managers/routing.manager';
import { type OllamaRouterManager } from '../managers/ollama-router.manager';
import { type PromptBuilderManager } from '../managers/prompt-builder.manager';
import { RoutingMode } from '../../../generated/prisma';
import { type RoutingPoliciesRepository } from '../repositories/routing-policies.repository';
import { type RoutingContext } from '../types/routing.types';
import { LocalModelRole } from '@claw/shared-types';

const mockPoliciesRepo = (): Partial<Record<keyof RoutingPoliciesRepository, jest.Mock>> => ({
  findActivePolicies: jest.fn().mockResolvedValue([]),
});

const baseContext: RoutingContext = {
  message: 'Hello, how are you?',
  threadId: 'thread-1',
  connectorHealth: {
    OPENAI: true,
    ANTHROPIC: true,
  },
  runtimeHealth: {
    OLLAMA: true,
  },
};

describe('RoutingManager', () => {
  let manager: RoutingManager;
  let promptBuilder: {
    fetchInstalledModels: jest.Mock;
    invalidateCache: jest.Mock;
  };

  beforeEach(() => {
    const policiesRepo = mockPoliciesRepo();
    const ollamaRouter = { route: jest.fn().mockResolvedValue(null) };
    promptBuilder = {
      fetchInstalledModels: jest.fn().mockResolvedValue([]),
      invalidateCache: jest.fn(),
    };
    manager = new RoutingManager(
      policiesRepo as unknown as RoutingPoliciesRepository,
      ollamaRouter as unknown as OllamaRouterManager,
      promptBuilder as unknown as PromptBuilderManager,
    );
  });

  describe('evaluateRoute - AUTO', () => {
    it('should route short messages to local when runtime is healthy', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.routingMode).toBe(RoutingMode.AUTO);
      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.reasonTags).toContain('short_message');
    });

    it('should route long messages to cloud', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'a'.repeat(600),
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.routingMode).toBe(RoutingMode.AUTO);
      expect(result.selectedProvider).toBe('ANTHROPIC');
      expect(result.reasonTags).toContain('cloud_preferred');
    });

    it('should default to AUTO when no userMode specified', async () => {
      const context: RoutingContext = { ...baseContext };

      const result = await manager.evaluateRoute(context);

      expect(result.routingMode).toBe(RoutingMode.AUTO);
    });
  });

  describe('evaluateRoute - MANUAL_MODEL', () => {
    it('should use forced model when specified', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.MANUAL_MODEL,
        forcedModel: 'gpt-4o',
      };

      const result = await manager.evaluateRoute(context);

      expect(result.routingMode).toBe(RoutingMode.MANUAL_MODEL);
      expect(result.selectedModel).toBe('gpt-4o');
      expect(result.confidence).toBe(1.0);
      expect(result.reasonTags).toContain('user_forced');
    });

    it('should infer Anthropic provider from claude model name', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.MANUAL_MODEL,
        forcedModel: 'claude-sonnet-4',
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('ANTHROPIC');
    });
  });

  describe('evaluateRoute - LOCAL_ONLY', () => {
    it('should always select local provider', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.LOCAL_ONLY,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.privacyClass).toBe('local');
      expect(result.costClass).toBe('free');
    });

    it('should not include cloud providers in fallback chain', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.LOCAL_ONLY,
      };

      const result = await manager.evaluateRoute(context);

      const cloudFallbacks = result.fallbackChain.filter((f) => f.provider !== 'local-ollama');
      expect(cloudFallbacks).toHaveLength(0);
    });
  });

  describe('evaluateRoute - PRIVACY_FIRST', () => {
    it('should prefer local when runtime is healthy', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.PRIVACY_FIRST,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.reasonTags).toContain('local_preferred');
    });

    it('should fall back to cloud when local is unavailable', async () => {
      const context: RoutingContext = {
        ...baseContext,
        runtimeHealth: { OLLAMA: false },
        userMode: RoutingMode.PRIVACY_FIRST,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('ANTHROPIC');
      expect(result.reasonTags).toContain('local_unavailable');
    });
  });

  describe('evaluateRoute - LOW_LATENCY', () => {
    it('should select fastest model', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.LOW_LATENCY,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('OPENAI');
      expect(result.reasonTags).toContain('fastest_model');
    });
  });

  describe('evaluateRoute - HIGH_REASONING', () => {
    it('should select strongest reasoning model', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.HIGH_REASONING,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('ANTHROPIC');
      expect(result.selectedModel).toBe('claude-opus-4');
      expect(result.reasonTags).toContain('strongest_model');
    });
  });

  describe('evaluateRoute - COST_SAVER', () => {
    it('should prefer free local model when available', async () => {
      const context: RoutingContext = {
        ...baseContext,
        userMode: RoutingMode.COST_SAVER,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.costClass).toBe('free');
    });

    it('should select cheapest cloud when local unavailable', async () => {
      const context: RoutingContext = {
        ...baseContext,
        runtimeHealth: { OLLAMA: false },
        userMode: RoutingMode.COST_SAVER,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('OPENAI');
      expect(result.costClass).toBe('low');
    });
  });

  describe('detectCodingRequest', () => {
    it('should detect coding prompts', () => {
      expect(manager.detectCodingRequest('fix this bug in my code')).toBe(true);
      expect(manager.detectCodingRequest('write a function to sort arrays')).toBe(true);
      expect(manager.detectCodingRequest('setup webpack config')).toBe(true);
      expect(manager.detectCodingRequest('configure Prisma schema')).toBe(true);
      expect(manager.detectCodingRequest('implement a React component')).toBe(true);
      expect(manager.detectCodingRequest('debug the API endpoint')).toBe(true);
    });

    it('should not detect non-coding prompts', () => {
      expect(manager.detectCodingRequest('tell me a joke')).toBe(false);
      expect(manager.detectCodingRequest('what is the weather today')).toBe(false);
    });
  });

  describe('detectReasoningRequest', () => {
    it('should detect reasoning prompts', () => {
      expect(manager.detectReasoningRequest('prove this theorem about limits')).toBe(true);
      expect(manager.detectReasoningRequest('calculate the probability of rain')).toBe(true);
      expect(manager.detectReasoningRequest('explain the reasoning step by step')).toBe(true);
      expect(manager.detectReasoningRequest('derive the equation for velocity')).toBe(true);
    });

    it('should not detect non-reasoning prompts', () => {
      expect(manager.detectReasoningRequest('write a blog post')).toBe(false);
      expect(manager.detectReasoningRequest('tell me a story')).toBe(false);
    });
  });

  describe('detectThinkingRequest', () => {
    it('should detect thinking prompts', () => {
      expect(manager.detectThinkingRequest('research the latest AI developments')).toBe(true);
      expect(manager.detectThinkingRequest('do a deep dive into climate change')).toBe(true);
      expect(manager.detectThinkingRequest('compare and contrast React vs Vue')).toBe(true);
      expect(manager.detectThinkingRequest('what are the pros and cons of remote work')).toBe(true);
    });

    it('should not detect non-thinking prompts', () => {
      expect(manager.detectThinkingRequest('fix this bug')).toBe(false);
      expect(manager.detectThinkingRequest('hello world')).toBe(false);
    });
  });

  describe('detectInfrastructureRequest', () => {
    it('should detect infrastructure prompts', () => {
      expect(manager.detectInfrastructureRequest('deploy to kubernetes cluster')).toBe(true);
      expect(manager.detectInfrastructureRequest('configure terraform modules')).toBe(true);
      expect(manager.detectInfrastructureRequest('setup AWS VPC networking')).toBe(true);
      expect(manager.detectInfrastructureRequest('write a helm chart')).toBe(true);
    });

    it('should not detect non-infrastructure prompts', () => {
      expect(manager.detectInfrastructureRequest('tell me a joke')).toBe(false);
      expect(manager.detectInfrastructureRequest('write a poem about cats')).toBe(false);
    });
  });

  describe('detectDataAnalysisRequest', () => {
    it('should detect data analysis prompts', () => {
      expect(manager.detectDataAnalysisRequest('create a pivot table from this data')).toBe(true);
      expect(manager.detectDataAnalysisRequest('build an ETL pipeline')).toBe(true);
      expect(manager.detectDataAnalysisRequest('analyze this dataset with pandas')).toBe(true);
      expect(manager.detectDataAnalysisRequest('train a neural network model')).toBe(true);
    });

    it('should not detect non-data-analysis prompts', () => {
      expect(manager.detectDataAnalysisRequest('tell me a joke')).toBe(false);
      expect(manager.detectDataAnalysisRequest('what is the capital of France')).toBe(false);
    });
  });

  describe('detectBusinessRequest', () => {
    it('should detect business prompts', () => {
      expect(manager.detectBusinessRequest('write a business case for this project')).toBe(true);
      expect(manager.detectBusinessRequest('analyze the conversion rate')).toBe(true);
      expect(manager.detectBusinessRequest('prepare a pitch deck')).toBe(true);
      expect(manager.detectBusinessRequest('calculate the ROI of this campaign')).toBe(true);
    });

    it('should not detect non-business prompts', () => {
      expect(manager.detectBusinessRequest('tell me a joke')).toBe(false);
      expect(manager.detectBusinessRequest('what is quantum physics')).toBe(false);
    });
  });

  describe('detectCreativeWritingRequest', () => {
    it('should detect creative writing prompts', () => {
      expect(manager.detectCreativeWritingRequest('write a blog post about AI')).toBe(true);
      expect(manager.detectCreativeWritingRequest('compose a poem about nature')).toBe(true);
      expect(manager.detectCreativeWritingRequest('draft a newsletter for customers')).toBe(true);
      expect(manager.detectCreativeWritingRequest('create a screenplay about robots')).toBe(true);
    });

    it('should not detect non-creative-writing prompts', () => {
      expect(manager.detectCreativeWritingRequest('fix this code bug')).toBe(false);
      expect(manager.detectCreativeWritingRequest('deploy to kubernetes')).toBe(false);
    });
  });

  describe('detectSecurityRequest', () => {
    it('should detect security prompts', () => {
      expect(manager.detectSecurityRequest('check for XSS vulnerabilities')).toBe(true);
      expect(manager.detectSecurityRequest('perform a penetration test')).toBe(true);
      expect(manager.detectSecurityRequest('review OWASP top 10 compliance')).toBe(true);
      expect(manager.detectSecurityRequest('analyze the CVE-2024-1234 exploit')).toBe(true);
    });

    it('should not detect non-security prompts', () => {
      expect(manager.detectSecurityRequest('tell me a joke')).toBe(false);
      expect(manager.detectSecurityRequest('write a poem')).toBe(false);
    });
  });

  describe('detectMedicalRequest', () => {
    it('should detect medical prompts', () => {
      expect(manager.detectMedicalRequest('review patient diagnosis for pneumonia')).toBe(true);
      expect(manager.detectMedicalRequest('check medication dosage for aspirin')).toBe(true);
      expect(manager.detectMedicalRequest('analyze the clinical trial results')).toBe(true);
      expect(manager.detectMedicalRequest('review HIPAA compliance requirements')).toBe(true);
    });

    it('should not detect non-medical prompts', () => {
      expect(manager.detectMedicalRequest('tell me a joke')).toBe(false);
      expect(manager.detectMedicalRequest('write a blog post')).toBe(false);
    });
  });

  describe('detectLegalRequest', () => {
    it('should detect legal prompts', () => {
      expect(manager.detectLegalRequest('review this contract clause')).toBe(true);
      expect(manager.detectLegalRequest('check GDPR compliance')).toBe(true);
      expect(manager.detectLegalRequest('draft an NDA agreement')).toBe(true);
      expect(manager.detectLegalRequest('analyze the liability exposure')).toBe(true);
    });

    it('should not detect non-legal prompts', () => {
      expect(manager.detectLegalRequest('tell me a joke')).toBe(false);
      expect(manager.detectLegalRequest('fix this code')).toBe(false);
    });
  });

  describe('detectTranslationRequest', () => {
    it('should detect translation prompts', () => {
      expect(manager.detectTranslationRequest('translate this to French')).toBe(true);
      expect(manager.detectTranslationRequest('localize the UI strings')).toBe(true);
      expect(manager.detectTranslationRequest('convert to English from Arabic')).toBe(true);
      expect(manager.detectTranslationRequest('i18n support for the app')).toBe(true);
    });

    it('should not detect non-translation prompts', () => {
      expect(manager.detectTranslationRequest('tell me a joke')).toBe(false);
      expect(manager.detectTranslationRequest('fix this bug')).toBe(false);
    });
  });

  describe('detectPrivacySensitive', () => {
    it('should detect privacy-sensitive prompts', () => {
      expect(manager.detectPrivacySensitive('analyze my medical records')).toBe(true);
      expect(manager.detectPrivacySensitive('review my tax return')).toBe(true);
      expect(manager.detectPrivacySensitive('my social security number is')).toBe(true);
      expect(manager.detectPrivacySensitive('credit card details for payment')).toBe(true);
      expect(manager.detectPrivacySensitive('salary negotiation advice')).toBe(true);
      expect(manager.detectPrivacySensitive('my personal data privacy concern')).toBe(true);
    });

    it('should not detect non-privacy prompts', () => {
      expect(manager.detectPrivacySensitive('what is the weather today')).toBe(false);
      expect(manager.detectPrivacySensitive('write a hello world program')).toBe(false);
    });
  });

  describe('detectHRRequest', () => {
    it('should detect HR prompts', () => {
      expect(manager.detectHRRequest('write a job description for a developer')).toBe(true);
      expect(manager.detectHRRequest('prepare interview questions for candidates')).toBe(true);
      expect(manager.detectHRRequest('design an onboarding process')).toBe(true);
      expect(manager.detectHRRequest('create a performance review template')).toBe(true);
    });

    it('should not detect non-HR prompts', () => {
      expect(manager.detectHRRequest('what is quantum physics')).toBe(false);
      expect(manager.detectHRRequest('deploy to production')).toBe(false);
    });
  });

  describe('detectFinanceRequest', () => {
    it('should detect finance prompts', () => {
      expect(manager.detectFinanceRequest('analyze the P&L statement')).toBe(true);
      expect(manager.detectFinanceRequest('calculate the IRR of this investment')).toBe(true);
      expect(manager.detectFinanceRequest('review the balance sheet')).toBe(true);
      expect(manager.detectFinanceRequest('build a DCF valuation model')).toBe(true);
    });

    it('should not detect non-finance prompts', () => {
      expect(manager.detectFinanceRequest('write a poem')).toBe(false);
      expect(manager.detectFinanceRequest('tell me about the solar system')).toBe(false);
    });
  });

  describe('detectOperationsRequest', () => {
    it('should detect operations prompts', () => {
      expect(manager.detectOperationsRequest('optimize the supply chain')).toBe(true);
      expect(manager.detectOperationsRequest('implement kanban workflow')).toBe(true);
      expect(manager.detectOperationsRequest('analyze the bottleneck in production')).toBe(true);
      expect(manager.detectOperationsRequest('create an SOP for the process')).toBe(true);
    });

    it('should not detect non-operations prompts', () => {
      expect(manager.detectOperationsRequest('write a poem')).toBe(false);
      expect(manager.detectOperationsRequest('what is dark matter')).toBe(false);
    });
  });

  describe('detectSalesRequest', () => {
    it('should detect sales prompts', () => {
      expect(manager.detectSalesRequest('prepare a proof of concept demo')).toBe(true);
      expect(manager.detectSalesRequest('analyze the churn risk for this account')).toBe(true);
      expect(manager.detectSalesRequest('create a battle card for competitor X')).toBe(true);
      expect(manager.detectSalesRequest('improve our NPS score')).toBe(true);
    });

    it('should not detect non-sales prompts', () => {
      expect(manager.detectSalesRequest('what is quantum physics')).toBe(false);
      expect(manager.detectSalesRequest('write a hello world program')).toBe(false);
    });
  });

  describe('detectRealEstateRequest', () => {
    it('should detect real estate prompts', () => {
      expect(manager.detectRealEstateRequest('calculate the mortgage payment')).toBe(true);
      expect(manager.detectRealEstateRequest('analyze the property appraisal')).toBe(true);
      expect(manager.detectRealEstateRequest('review the zoning regulations')).toBe(true);
      expect(manager.detectRealEstateRequest('compute the cap rate for this building')).toBe(true);
    });

    it('should not detect non-real-estate prompts', () => {
      expect(manager.detectRealEstateRequest('write a poem')).toBe(false);
      expect(manager.detectRealEstateRequest('fix this code bug')).toBe(false);
    });
  });

  describe('detectEducationRequest', () => {
    it('should detect education prompts', () => {
      expect(manager.detectEducationRequest('design a curriculum for math')).toBe(true);
      expect(manager.detectEducationRequest('create a lesson plan for biology')).toBe(true);
      expect(manager.detectEducationRequest('develop learning objectives')).toBe(true);
      expect(manager.detectEducationRequest('build a rubric for grading essays')).toBe(true);
    });

    it('should not detect non-education prompts', () => {
      expect(manager.detectEducationRequest('deploy to kubernetes')).toBe(false);
      expect(manager.detectEducationRequest('what is the weather today')).toBe(false);
    });
  });

  describe('detectCustomerSupportRequest', () => {
    it('should detect customer support prompts', () => {
      expect(manager.detectCustomerSupportRequest('create a helpdesk ticket template')).toBe(true);
      expect(manager.detectCustomerSupportRequest('build a knowledge base article')).toBe(true);
      expect(manager.detectCustomerSupportRequest('draft a canned response for refunds')).toBe(true);
      expect(manager.detectCustomerSupportRequest('improve our CSAT scores')).toBe(true);
    });

    it('should not detect non-customer-support prompts', () => {
      expect(manager.detectCustomerSupportRequest('what is dark matter')).toBe(false);
      expect(manager.detectCustomerSupportRequest('write a poem about nature')).toBe(false);
    });
  });

  describe('detectVideoAudioRequest', () => {
    it('should detect video/audio prompts', () => {
      expect(manager.detectVideoAudioRequest('write a video script for YouTube')).toBe(true);
      expect(manager.detectVideoAudioRequest('create a storyboard for the ad')).toBe(true);
      expect(manager.detectVideoAudioRequest('edit the timeline for the documentary')).toBe(true);
      expect(manager.detectVideoAudioRequest('add a voiceover to this clip')).toBe(true);
    });

    it('should not detect non-video-audio prompts', () => {
      expect(manager.detectVideoAudioRequest('fix this code bug')).toBe(false);
      expect(manager.detectVideoAudioRequest('what is the capital of France')).toBe(false);
    });
  });

  describe('detectDesignRequest', () => {
    it('should detect design prompts', () => {
      expect(manager.detectDesignRequest('create a wireframe for the login page')).toBe(true);
      expect(manager.detectDesignRequest('design a mockup in Figma')).toBe(true);
      expect(manager.detectDesignRequest('build a design system for the app')).toBe(true);
      expect(manager.detectDesignRequest('choose a color palette for the brand')).toBe(true);
    });

    it('should not detect non-design prompts', () => {
      expect(manager.detectDesignRequest('calculate the tax return')).toBe(false);
      expect(manager.detectDesignRequest('what is quantum physics')).toBe(false);
    });
  });

  describe('detectResearchRequest', () => {
    it('should detect research prompts', () => {
      expect(manager.detectResearchRequest('conduct a literature review on AI ethics')).toBe(true);
      expect(manager.detectResearchRequest('survey design for user feedback')).toBe(true);
      expect(manager.detectResearchRequest('use qualitative methods for analysis')).toBe(true);
      expect(manager.detectResearchRequest('write an abstract for the paper')).toBe(true);
    });

    it('should not detect non-research prompts', () => {
      expect(manager.detectResearchRequest('fix this code')).toBe(false);
      expect(manager.detectResearchRequest('what is the weather today')).toBe(false);
    });
  });

  describe('detectExecutiveRequest', () => {
    it('should detect executive prompts', () => {
      expect(manager.detectExecutiveRequest('prepare for the board meeting')).toBe(true);
      expect(manager.detectExecutiveRequest('draft the quarterly earnings report')).toBe(true);
      expect(manager.detectExecutiveRequest('analyze the M&A opportunity')).toBe(true);
      expect(manager.detectExecutiveRequest('review corporate governance policy')).toBe(true);
    });

    it('should not detect non-executive prompts', () => {
      expect(manager.detectExecutiveRequest('write a hello world program')).toBe(false);
      expect(manager.detectExecutiveRequest('what is the weather today')).toBe(false);
    });
  });

  describe('detectEngineeringRequest', () => {
    it('should detect engineering prompts', () => {
      expect(manager.detectEngineeringRequest('run FEA on this structural model')).toBe(true);
      expect(manager.detectEngineeringRequest('design a PCB schematic')).toBe(true);
      expect(manager.detectEngineeringRequest('analyze the fluid dynamics of this pipe')).toBe(true);
      expect(manager.detectEngineeringRequest('create a CAD model of the bracket')).toBe(true);
    });

    it('should not detect non-engineering prompts', () => {
      expect(manager.detectEngineeringRequest('write a poem')).toBe(false);
      expect(manager.detectEngineeringRequest('tell me a joke')).toBe(false);
    });
  });

  describe('detectScienceRequest', () => {
    it('should detect science prompts', () => {
      expect(manager.detectScienceRequest('explain quantum mechanics')).toBe(true);
      expect(manager.detectScienceRequest('analyze this spectroscopy data')).toBe(true);
      expect(manager.detectScienceRequest('describe the CRISPR gene editing process')).toBe(true);
      expect(manager.detectScienceRequest('solve this differential equation')).toBe(true);
    });

    it('should not detect non-science prompts', () => {
      expect(manager.detectScienceRequest('write a blog post')).toBe(false);
      expect(manager.detectScienceRequest('plan a marketing campaign')).toBe(false);
    });
  });

  describe('detectGovernmentRequest', () => {
    it('should detect government prompts', () => {
      expect(manager.detectGovernmentRequest('analyze government procurement rules')).toBe(true);
      expect(manager.detectGovernmentRequest('review the FOIA request process')).toBe(true);
      expect(manager.detectGovernmentRequest('prepare a policy brief on education')).toBe(true);
      expect(manager.detectGovernmentRequest('assess national security implications')).toBe(true);
    });

    it('should not detect non-government prompts', () => {
      expect(manager.detectGovernmentRequest('write a poem')).toBe(false);
      expect(manager.detectGovernmentRequest('fix this code bug')).toBe(false);
    });
  });

  describe('detectLogisticsRequest', () => {
    it('should detect logistics prompts', () => {
      expect(manager.detectLogisticsRequest('optimize freight forwarding routes')).toBe(true);
      expect(manager.detectLogisticsRequest('review the bill of lading')).toBe(true);
      expect(manager.detectLogisticsRequest('manage warehouse operations with WMS')).toBe(true);
      expect(manager.detectLogisticsRequest('analyze cold chain temperature data')).toBe(true);
    });

    it('should not detect non-logistics prompts', () => {
      expect(manager.detectLogisticsRequest('write a poem about love')).toBe(false);
      expect(manager.detectLogisticsRequest('explain quantum physics')).toBe(false);
    });
  });

  describe('detectHospitalityRequest', () => {
    it('should detect hospitality prompts', () => {
      expect(manager.detectHospitalityRequest('calculate the RevPAR for this hotel')).toBe(true);
      expect(manager.detectHospitalityRequest('plan a catering menu for the event')).toBe(true);
      expect(manager.detectHospitalityRequest('optimize the reservation system')).toBe(true);
      expect(manager.detectHospitalityRequest('analyze guest satisfaction scores')).toBe(true);
    });

    it('should not detect non-hospitality prompts', () => {
      expect(manager.detectHospitalityRequest('fix this code bug')).toBe(false);
      expect(manager.detectHospitalityRequest('solve this equation')).toBe(false);
    });
  });

  describe('detectMediaRequest', () => {
    it('should detect media prompts', () => {
      expect(manager.detectMediaRequest('write in AP style for the news article')).toBe(true);
      expect(manager.detectMediaRequest('plan the editorial calendar')).toBe(true);
      expect(manager.detectMediaRequest('review the galley proof before publishing')).toBe(true);
      expect(manager.detectMediaRequest('analyze Nielsen ratings for the show')).toBe(true);
    });

    it('should not detect non-media prompts', () => {
      expect(manager.detectMediaRequest('fix this code')).toBe(false);
      expect(manager.detectMediaRequest('calculate mortgage payments')).toBe(false);
    });
  });

  describe('detectSustainabilityRequest', () => {
    it('should detect sustainability prompts', () => {
      expect(manager.detectSustainabilityRequest('prepare an ESG reporting framework')).toBe(true);
      expect(manager.detectSustainabilityRequest('calculate carbon emissions for Scope 1')).toBe(true);
      expect(manager.detectSustainabilityRequest('analyze the carbon offset options')).toBe(true);
      expect(manager.detectSustainabilityRequest('implement circular economy principles')).toBe(true);
    });

    it('should not detect non-sustainability prompts', () => {
      expect(manager.detectSustainabilityRequest('fix this code bug')).toBe(false);
      expect(manager.detectSustainabilityRequest('what is the capital of Spain')).toBe(false);
    });
  });

  describe('privacy-enforced routing in AUTO mode', () => {
    it('should force local when privacy-sensitive content detected', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'analyze my patient diagnosis records',
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.reasonTags).toContain('privacy_enforced');
      expect(result.privacyClass).toBe('local');
      const cloudFallbacks = result.fallbackChain.filter((f) => f.provider !== 'local-ollama');
      expect(cloudFallbacks).toHaveLength(0);
    });

    it('should force local for medical content in AUTO mode', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'review the clinical trial data for the new medication dosage',
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.reasonTags).toContain('privacy_enforced');
      expect(result.privacyClass).toBe('local');
    });

    it('should force local for legal content in AUTO mode', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'review the contract clause about indemnification and liability',
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.reasonTags).toContain('privacy_enforced');
    });

    it('should force local for finance content in AUTO mode', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'analyze the P&L and EBITDA for Q3 earnings',
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.reasonTags).toContain('privacy_enforced');
    });

    it('should force local for government/intelligence content in AUTO mode', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'review the national security intelligence analysis report',
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.reasonTags).toContain('privacy_enforced');
    });

    it('should force local for executive content in AUTO mode', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'prepare for the M&A board meeting about the acquisition',
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.reasonTags).toContain('privacy_enforced');
    });
  });

  describe('category fallback to default local model', () => {
    it('should use default local model when no specialized model is installed for detected category', async () => {
      promptBuilder.fetchInstalledModels.mockResolvedValue([]);
      const context: RoutingContext = {
        ...baseContext,
        message: 'debug the API endpoint and fix this bug in the code',
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.reasonTags).toContain('category_detected');
      expect(result.reasonTags).toContain('default_local');
    });

    it('should use specialized model when one is installed for the detected category', async () => {
      promptBuilder.fetchInstalledModels.mockResolvedValue([
        {
          name: 'qwen2.5-coder',
          tag: '7b',
          category: 'coding',
          roles: [LocalModelRole.LOCAL_CODING],
          capabilities: ['code_generation'],
          parameterCount: '7B',
        },
      ]);
      const context: RoutingContext = {
        ...baseContext,
        message: 'debug the API endpoint and fix this bug in the code',
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.selectedProvider).toBe('local-ollama');
      expect(result.selectedModel).toBe('qwen2.5-coder:7b');
      expect(result.reasonTags).toContain('category_specific');
    });
  });

  describe('image detection patterns', () => {
    it('should detect image requests with art style keywords', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'create a photorealistic sunset over mountains',
        userMode: RoutingMode.AUTO,
        connectorHealth: { OPENAI: true, ANTHROPIC: true, GEMINI: true },
      };

      const result = await manager.evaluateRoute(context);

      expect(result.reasonTags).toContain('image_generation');
    });

    it('should detect image requests with strong noun patterns', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'design an illustration of a cat wearing a hat',
        userMode: RoutingMode.AUTO,
        connectorHealth: { OPENAI: true, ANTHROPIC: true, GEMINI: true },
      };

      const result = await manager.evaluateRoute(context);

      expect(result.reasonTags).toContain('image_generation');
    });

    it('should detect image requests with verb + image-word combo', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'generate a beautiful landscape photo',
        userMode: RoutingMode.AUTO,
        connectorHealth: { OPENAI: true, ANTHROPIC: true, GEMINI: true },
      };

      const result = await manager.evaluateRoute(context);

      expect(result.reasonTags).toContain('image_generation');
    });

    it('should not detect non-image requests', async () => {
      const context: RoutingContext = {
        ...baseContext,
        message: 'explain how photosynthesis works in plants',
        userMode: RoutingMode.AUTO,
      };

      const result = await manager.evaluateRoute(context);

      expect(result.reasonTags).not.toContain('image_generation');
    });
  });

  describe('buildFallbackChain', () => {
    it('should include cloud fallbacks for local primary', () => {
      const primary = { provider: 'local-ollama', model: 'llama3:latest' };

      const chain = manager.buildFallbackChain(primary, baseContext);

      expect(chain.length).toBeGreaterThan(0);
      expect(chain.some((f) => f.provider === 'ANTHROPIC')).toBe(true);
    });

    it('should include local fallback for cloud primary', () => {
      const primary = { provider: 'OPENAI', model: 'gpt-4o-mini' };

      const chain = manager.buildFallbackChain(primary, baseContext);

      expect(chain.some((f) => f.provider === 'local-ollama')).toBe(true);
    });

    it('should only include healthy providers in chain', () => {
      const context: RoutingContext = {
        ...baseContext,
        connectorHealth: { OPENAI: false, ANTHROPIC: true },
        runtimeHealth: { OLLAMA: false },
      };
      const primary = { provider: 'ANTHROPIC', model: 'claude-sonnet-4' };

      const chain = manager.buildFallbackChain(primary, context);

      expect(chain.every((f) => f.provider !== 'OPENAI')).toBe(true);
      expect(chain.every((f) => f.provider !== 'local-ollama')).toBe(true);
    });
  });
});
