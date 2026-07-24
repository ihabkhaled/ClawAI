// Controllers own transport only: 3-line methods that extract params, call ONE
// service method, and return. Flags try/catch and throw inside *.controller.ts,
// and method bodies with more than the allowed number of statements.
const MAX_STATEMENTS = 3;

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Controllers must delegate: no try/catch, no throw, and short method bodies.' },
    schema: [{ type: 'object', properties: { maxStatements: { type: 'number' } }, additionalProperties: false }],
    messages: {
      noTry: 'Controllers must not contain try/catch — let the GlobalExceptionFilter handle errors.',
      noThrow: 'Controllers must not throw — delegate to the service and let the exception filter map errors.',
      tooLong:
        'Controller method "{{name}}" has {{count}} statements (max {{max}}). Extract params, call ONE service method, return.',
    },
  },
  create(context) {
    const filename = (context.filename ?? context.getFilename()).replace(/\\/g, '/');
    if (!filename.endsWith('.controller.ts')) return {};
    const max = context.options[0]?.maxStatements ?? MAX_STATEMENTS;
    return {
      TryStatement(node) {
        context.report({ node, messageId: 'noTry' });
      },
      ThrowStatement(node) {
        context.report({ node, messageId: 'noThrow' });
      },
      MethodDefinition(node) {
        if (node.kind === 'constructor') return;
        const body = node.value?.body?.body;
        if (Array.isArray(body) && body.length > max) {
          context.report({
            node: node.key,
            messageId: 'tooLong',
            data: { name: node.key.name ?? 'method', count: body.length, max },
          });
        }
      },
    };
  },
};
