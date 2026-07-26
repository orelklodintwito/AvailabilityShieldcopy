import reactHooks from "eslint-plugin-react-hooks";

export default [{
  files: ["src/**/*.{js,jsx}"],
  ignores: ["dist/**"],
  languageOptions: {
    parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
    globals: { window: "readonly", fetch: "readonly", AbortController: "readonly", AbortSignal: "readonly", document: "readonly", URL: "readonly", Blob: "readonly" }
  },
  plugins: { "react-hooks": reactHooks },
  rules: {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-undef": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}];
