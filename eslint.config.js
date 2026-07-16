import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        QRCodeStyling: "readonly",
        lucide: "readonly",
        mdui: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-redeclare": "error",
      "eqeqeq": "error",
      "no-throw-literal": "error",
      "prefer-const": "error",
      "no-implicit-globals": "error",
      "no-return-assign": "error",
      "no-sequences": "error",
      "no-duplicate-imports": "error",
      "no-unused-expressions": "error"
    }
  },
  {
    files: ["tests/**"],
    languageOptions: {
      globals: {
        ...globals.node,
        vi: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly"
      }
    }
  }
];
