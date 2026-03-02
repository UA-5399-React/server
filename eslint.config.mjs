// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '*.min.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      'eqeqeq': ['error', 'always'],
      'no-duplicate-imports': 'off',
      '@typescript-eslint/no-unsafe-assignment': "warn",
      '@typescript-eslint/require-await': "warn",
      '@typescript-eslint/no-unsafe-member-access': "warn",
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Side-effects (ex., 'reflect-metadata')
            ['^\\u0000'],
            // Built-in Node.js modules (fs, path, crypto etc.)
            ['^node:'],
            // External packages (@nestjs/*, rxjs etc.)
            ['^@?\\w'],
            // Internal packages (starting with @/)
            ['^@/'],
            // Relative imports (parent folders firtst ../, and then current ./)
            ['^\\.\\.', '^\\.'],
          ],
        },
      ],
    },
  },
);
