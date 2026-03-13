module.exports = {
  root: true,
  extends: ["@remix-run/eslint-config", "@remix-run/eslint-config/node"],
  ignorePatterns: ["build/**", "dist/**", "node_modules/**"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/array-type": "off",
    "react/no-unescaped-entities": "off"
  },
};
