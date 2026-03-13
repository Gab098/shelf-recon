import babelParser from "@babel/eslint-parser";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";

export default [
  {
    ignores: ["build/**", "dist/**", "node_modules/**", "prisma/migrations/**"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        sourceType: "module",
        ecmaVersion: "latest",
        babelOptions: {
          presets: ["@babel/preset-react", "@babel/preset-typescript"],
        },
      },
    },
    plugins: {
      import: importPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // We use a lot of apostrophes/quotes in Italian UX copy.
      "react/no-unescaped-entities": "off",

      // Keep obvious correctness rules on.
      "no-var": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
