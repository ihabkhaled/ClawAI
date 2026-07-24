import { detectService } from '../../architecture.config.mjs';

// A service must never reach into ANOTHER service's internals. Cross-service
// communication is HTTP or RabbitMQ only. Flags relative/aliased imports that
// resolve into a different claw-*-service source tree.
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow importing another service\'s internal source; use HTTP or RabbitMQ.' },
    schema: [],
    messages: {
      crossService:
        'Cross-service internal import: {{from}} must not import {{into}}. Services communicate via HTTP or RabbitMQ (claw.events), not shared source.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    const ownService = detectService(filename);
    if (!ownService) return {};
    return {
      ImportDeclaration(node) {
        const source = String(node.source.value);
        const m = /(claw-[a-z0-9-]+-service)\/src/.exec(source);
        if (m && m[1] !== ownService) {
          context.report({ node, messageId: 'crossService', data: { from: ownService, into: m[1] } });
        }
      },
    };
  },
};
