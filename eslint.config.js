// eslint.config.js
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import autoImports from './.wxt/eslint-auto-imports.mjs';


export default ts.config(
  autoImports,

  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
      },
    },
  },
  {
    rules: {
      // Add or override rules here
      'svelte/no-unused-svelte-ignore': 'error',
      '@typescript-eslint/triple-slash-reference': 'error',
      'svelte/no-unused-svelte-ignore': 'warn',
    },
  }
);
