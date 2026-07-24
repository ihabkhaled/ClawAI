// Repositories are pure data access: return data or null and let services decide.
// Flags throw statements inside *.repository.ts.
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Repositories must not throw — return data or null; services decide what to do.' },
    schema: [],
    messages: {
      noThrow: 'Repository must not throw. Return data or null and let the service decide the error behaviour.',
    },
  },
  create(context) {
    const filename = (context.filename ?? context.getFilename()).replace(/\\/g, '/');
    if (!filename.endsWith('.repository.ts')) return {};
    return {
      ThrowStatement(node) {
        context.report({ node, messageId: 'noThrow' });
      },
    };
  },
};
