import { CONFIG_FILE_PATTERNS } from '../../architecture.config.mjs';

// process.env may only be read in the config layer (AppConfig / main.ts). Every
// other file must read Zod-validated config, never raw env.
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Read config via AppConfig; process.env is only allowed in the config layer.' },
    schema: [],
    messages: {
      noProcessEnv: 'Do not read process.env here — use the Zod-validated AppConfig. Raw env is config-layer only.',
    },
  },
  create(context) {
    const filename = (context.filename ?? context.getFilename()).replace(/\\/g, '/');
    const isConfig = CONFIG_FILE_PATTERNS.some((re) => re.test(filename));
    if (isConfig) return {};
    return {
      MemberExpression(node) {
        if (
          node.object?.type === 'Identifier' &&
          node.object.name === 'process' &&
          node.property?.type === 'Identifier' &&
          node.property.name === 'env'
        ) {
          context.report({ node, messageId: 'noProcessEnv' });
        }
      },
    };
  },
};
