import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-console': 'off',
    },
  },
];
