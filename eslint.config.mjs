import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    plugins: {
      '@firebase/security-rules': firebaseRulesPlugin,
    },
    languageOptions: {
        parserOptions: {
            ecmaVersion: 2020,
        },
    },
    rules: {
      '@firebase/security-rules/no-unauthorized-access': 'error',
      // Add other relevant rules
    },
    files: ['firestore.rules'],
  },
];
