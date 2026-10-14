import { describe, expect, it } from 'vitest';

import answer_repair_manager_source from '../managers/answer-repair.manager.ts?raw';
import task_decomposition_manager_source from '../managers/task-decomposition.manager.ts?raw';
import best_of_n_manager_source from '../managers/best-of-n.manager.ts?raw';
import verifier_manager_source from '../managers/verifier.manager.ts?raw';
import pipeline_manager_source from '../managers/pipeline.manager.ts?raw';
import cost_ensemble_manager_source from '../managers/cost-ensemble.manager.ts?raw';
import role_pack_manager_source from '../managers/role-pack.manager.ts?raw';
import parallel_execution_manager_source from '../managers/parallel-execution.manager.ts?raw';
import consensus_execution_manager_source from '../managers/consensus-execution.manager.ts?raw';
import escalation_chain_manager_source from '../managers/escalation-chain.manager.ts?raw';
import compare_judge_manager_source from '../managers/compare-judge.manager.ts?raw';
import judge_referee_manager_source from '../managers/judge-referee.manager.ts?raw';
import chat_messages_service_source from '../services/chat-messages.service.ts?raw';
import best_of_n_message_dto_source from '../dto/best-of-n-message.dto.ts?raw';
import consensus_message_dto_source from '../dto/consensus-message.dto.ts?raw';
import cost_ensemble_message_dto_source from '../dto/cost-ensemble-message.dto.ts?raw';
import decompose_task_dto_source from '../dto/decompose-task.dto.ts?raw';
import escalation_chain_message_dto_source from '../dto/escalation-chain-message.dto.ts?raw';
import parallel_message_dto_source from '../dto/parallel-message.dto.ts?raw';
import pipeline_message_dto_source from '../dto/pipeline-message.dto.ts?raw';
import repair_message_dto_source from '../dto/repair-message.dto.ts?raw';
import role_pack_message_dto_source from '../dto/role-pack-message.dto.ts?raw';
import verify_message_dto_source from '../dto/verify-message.dto.ts?raw';

// The parity guard (rules/59). Normal chat is the one pipeline; Compare, Consensus,
// Escalation, the judge/critic and the seven labs are surfaces over it, never copies of it.
// This reads the source on purpose: a surface that quietly grows its own thread creation,
// its own raw provider call or its own request shape fails here, before a user finds out
// that a feature chat has does not exist in a lab.

// Every file the guard reads is a literal ?raw import, so no path is built at run time.
const SOURCES: Readonly<Record<string, string>> = {
  'managers/answer-repair.manager.ts': answer_repair_manager_source,
  'managers/task-decomposition.manager.ts': task_decomposition_manager_source,
  'managers/best-of-n.manager.ts': best_of_n_manager_source,
  'managers/verifier.manager.ts': verifier_manager_source,
  'managers/pipeline.manager.ts': pipeline_manager_source,
  'managers/cost-ensemble.manager.ts': cost_ensemble_manager_source,
  'managers/role-pack.manager.ts': role_pack_manager_source,
  'managers/parallel-execution.manager.ts': parallel_execution_manager_source,
  'managers/consensus-execution.manager.ts': consensus_execution_manager_source,
  'managers/escalation-chain.manager.ts': escalation_chain_manager_source,
  'managers/compare-judge.manager.ts': compare_judge_manager_source,
  'managers/judge-referee.manager.ts': judge_referee_manager_source,
  'services/chat-messages.service.ts': chat_messages_service_source,
  'dto/best-of-n-message.dto.ts': best_of_n_message_dto_source,
  'dto/consensus-message.dto.ts': consensus_message_dto_source,
  'dto/cost-ensemble-message.dto.ts': cost_ensemble_message_dto_source,
  'dto/decompose-task.dto.ts': decompose_task_dto_source,
  'dto/escalation-chain-message.dto.ts': escalation_chain_message_dto_source,
  'dto/parallel-message.dto.ts': parallel_message_dto_source,
  'dto/pipeline-message.dto.ts': pipeline_message_dto_source,
  'dto/repair-message.dto.ts': repair_message_dto_source,
  'dto/role-pack-message.dto.ts': role_pack_message_dto_source,
  'dto/verify-message.dto.ts': verify_message_dto_source,
};

// Comments describe the old behaviour on purpose; only executable text counts.
function source(relative: string): string {
  const raw = SOURCES[relative];
  if (raw === undefined) {
    throw new Error(`orchestration-parity: ${relative} is not in the SOURCES map`);
  }
  return raw.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/^\s*\/\/.*$/gm, '');
}

const LAB_MANAGERS = [
  'answer-repair',
  'task-decomposition',
  'best-of-n',
  'verifier',
  'pipeline',
  'cost-ensemble',
  'role-pack',
] as const;

const COMPARE_FAMILY_MANAGERS = [
  'parallel-execution',
  'consensus-execution',
  'escalation-chain',
] as const;

// Documented exception (rules/59 item 6, TD-044): Consensus synthesis is a local reducer call
// that meters itself. Moving it onto connector models changes who pays, so it is a billing
// decision, not a refactor. Nothing else may post to the Ollama generate route directly.
const RAW_OLLAMA_ALLOWED = new Set(['consensus-execution']);

const LAB_DTOS = [
  'best-of-n-message',
  'consensus-message',
  'cost-ensemble-message',
  'decompose-task',
  'escalation-chain-message',
  'parallel-message',
  'pipeline-message',
  'repair-message',
  'role-pack-message',
  'verify-message',
] as const;

// Every fragment chat gives a message that a lab can express must be on every lab DTO.
const SHARED_FRAGMENTS = [
  'researchFields',
  'attachmentFields',
  'contextPackFields',
  'pluginFields',
] as const;

describe('orchestration parity with normal chat', () => {
  describe.each(LAB_MANAGERS)('lab manager %s', (name) => {
    const text = source(`managers/${name}.manager.ts`);

    it('assembles context through the chat context gateway', () => {
      expect(text).toContain('ChatContextGatewayManager');
    });

    it('calls the model through the shared execution gateway (chat chokepoint)', () => {
      expect(text).toContain('ModeExecutionGatewayManager');
    });

    it('obtains its thread from the shared resolver, not its own create()', () => {
      expect(text).toContain('resolveOrchestrationThread');
      expect(text).not.toContain('chatThreadsRepository.create(');
    });

    it('never posts to the raw Ollama route', () => {
      expect(text).not.toContain('api/v1/ollama/generate');
    });
  });

  describe.each(COMPARE_FAMILY_MANAGERS)('compare-family manager %s', (name) => {
    const text = source(`managers/${name}.manager.ts`);

    it('assembles context through the chat context gateway', () => {
      expect(text).toContain('ChatContextGatewayManager');
    });

    it('does not create its own thread', () => {
      expect(text).not.toContain('chatThreadsRepository.create(');
    });

    it('posts to the raw Ollama route only where documented', () => {
      if (RAW_OLLAMA_ALLOWED.has(name)) {
        return;
      }
      expect(text).not.toContain('api/v1/ollama/generate');
    });
  });

  it('the judge and critic call models through the chat chokepoint', () => {
    const text = source('managers/judge-referee.manager.ts');
    expect(text).toContain('callProvider');
    expect(text).not.toContain('api/v1/ollama/generate');
  });

  it('the service resolves Compare, Consensus and Escalation threads through the shared resolver', () => {
    const text = source('services/chat-messages.service.ts');
    expect(text.match(/resolveOrchestrationThread\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  describe.each(LAB_DTOS)('dto %s', (name) => {
    const text = source(`dto/${name}.dto.ts`);
    it.each(SHARED_FRAGMENTS)('spreads %s', (fragment) => {
      expect(text).toContain(`...${fragment}`);
    });
  });

  // @mentioned plugins reach a surface through the USER message it stores: the gateway reads
  // `pluginRefs` off the latest user turn, so a surface that stores its own turn without them
  // quietly drops every mention (rule 59).
  describe.each([...LAB_MANAGERS, ...COMPARE_FAMILY_MANAGERS])(
    'manager %s stores the plugin mentions',
    (name) => {
      it('writes pluginRefs into its user message metadata', () => {
        expect(source(`managers/${name}.manager.ts`)).toContain('pluginRefsMetadata(');
      });
    },
  );

  it('no manager outside the allow-list posts to the raw Ollama route', () => {
    const all = [...LAB_MANAGERS, ...COMPARE_FAMILY_MANAGERS, 'compare-judge', 'judge-referee'];
    for (const name of all) {
      if (RAW_OLLAMA_ALLOWED.has(name)) {
        continue;
      }
      expect(source(`managers/${name}.manager.ts`), name).not.toContain('api/v1/ollama/generate');
    }
  });
});
