module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        varsIgnorePattern: "Type$",
        argsIgnorePattern: "^_",
      },
    ],
    "no-constant-condition": "off",
  },
  overrides: [
    {
      files: "**/*.cjs",
      env: { node: true },
    },
    {
      files: "test/**/*.js",
      env: { mocha: true },
    },
  ],
};
