const globals = require('globals')
const react = require('eslint-plugin-react')

module.exports = [
  {
    ignores: ['**/node_modules/**', 'taro-app/dist/**'],
  },
  {
    files: [
      'cloudfunctions/**/*.js',
      'taro-app/src/**/*.{js,jsx}',
      'scripts/**/*.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        App: 'writable',
        Behavior: 'writable',
        Component: 'writable',
        Page: 'writable',
        getApp: 'readonly',
        getCurrentPages: 'readonly',
        wx: 'readonly',
      },
    },
    plugins: { react },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'no-constant-binary-expression': 'error',
      'no-dupe-keys': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
      // Existing standalone audit scripts intentionally expose some probe state
      // for manual inspection. Keep this visible without preventing unrelated
      // quality failures from returning a non-zero exit status.
      'no-unused-vars': ['warn', {
        args: 'none',
        caughtErrors: 'none',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
      }],
      'react/jsx-uses-vars': 'error',
    },
  },
]
