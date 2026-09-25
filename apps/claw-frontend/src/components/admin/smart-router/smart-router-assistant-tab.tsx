import { Separator } from '@/components/ui/separator';
import {
  ASSISTANT_MODEL_ROLE_FILE_WRITER,
  ASSISTANT_MODEL_ROLE_RESEARCH_GATE,
  ASSISTANT_MODEL_ROLE_VISION_HELPER,
  type SmartRouterAssistantTabProps,
} from '@/types/smart-router-admin.types';

import { SmartRouterAssistantRoleSection } from './smart-router-assistant-role-section';

/**
 * The small models that do jobs around an answer, each an admin choice:
 * - Research gate: decides whether and how a turn uses the web.
 * - File writer: writes the content of an AI-generated file (F0, 2026-09-19;
 *   they were hard-coded and failed whenever the admin had not exposed them).
 * - Vision helper: describes an attached image when the chosen model cannot
 *   see (ADR-120 batch 5); the chosen model still writes the answer.
 */
export function SmartRouterAssistantTab({ t }: SmartRouterAssistantTabProps): React.ReactElement {
  return (
    <div className="space-y-8">
      <SmartRouterAssistantRoleSection
        role={ASSISTANT_MODEL_ROLE_RESEARCH_GATE}
        titleKey="smartRouterAdmin.assistant.researchGateTitle"
        descriptionKey="smartRouterAdmin.assistant.researchGateDescription"
        emptyKey="smartRouterAdmin.assistant.emptyMeansDisabled"
        t={t}
      />
      <Separator />
      <SmartRouterAssistantRoleSection
        role={ASSISTANT_MODEL_ROLE_FILE_WRITER}
        titleKey="smartRouterAdmin.assistant.fileWriterTitle"
        descriptionKey="smartRouterAdmin.assistant.fileWriterDescription"
        emptyKey="smartRouterAdmin.assistant.fileWriterEmpty"
        t={t}
      />
      <Separator />
      <SmartRouterAssistantRoleSection
        role={ASSISTANT_MODEL_ROLE_VISION_HELPER}
        titleKey="smartRouterAdmin.assistant.visionHelperTitle"
        descriptionKey="smartRouterAdmin.assistant.visionHelperDescription"
        emptyKey="smartRouterAdmin.assistant.visionHelperEmpty"
        t={t}
      />
    </div>
  );
}
