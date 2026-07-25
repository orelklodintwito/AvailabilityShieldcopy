import reactHooks from "eslint-plugin-react-hooks";

export default [{
  files: ["src/**/*.{js,jsx}"],
  ignores: ["dist/**"],
  plugins: { "react-hooks": reactHooks },
  rules: {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-undef": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}];
