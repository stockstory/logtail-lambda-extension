module.exports = {
  env: {
    node: true,
    jest: true,
  },
  root: true,

  ignorePatterns: ['node_modules', '**/vendor/*', 'dist', 'coverage'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },

  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  plugins: ['jest'],

  rules: {
    'no-console': 'off',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['fp-ts/*'],
            message:
              "Import only from 'fp-ts', do not import from 'fp-ts/lib/*' or 'fp-ts/*'. This is to have tree-shaking working correctly, see https://github.com/gcanti/fp-ts/issues/1044.",
          },
        ],
      },
    ],
  },

  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },

      plugins: ['@typescript-eslint'],

      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:prettier/recommended',
      ],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
      },
    },
  ],
};
