const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      '**/node_modules/**',
      '.expo/**',
      '**/dist/**',
      '**/build/**',
      'api/**',
      'ios/**',
      'android/**',
      '*.config.js',
      'convex/_generated/**',
    ],
  },
]);
