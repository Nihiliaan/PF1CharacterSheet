module.exports = {
  plugins: ['@firebase/eslint-plugin-security-rules'],
  rules: {
    '@firebase/security-rules/no-unauthorized-access': 'error',
    // add other rules as needed
  },
};
