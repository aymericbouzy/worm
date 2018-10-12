module.exports = {
  parser: "babel-eslint",
  extends: ["eslint:recommended", "prettier"],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": [
      "error",
      {
        semi: false,
        trailingComma: "es5",
      },
    ],
    "no-var": "error",
    "prefer-const": "warn",
    "require-await": "error",
    "one-var": ["error", { uninitialized: "always", initialized: "never" }],
    "max-params": ["error", 3],
    "prefer-template": "error",
    "no-template-curly-in-string": "error",
  },
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module",
    ecmaFeatures: {
      experimentalObjectRestSpread: false,
    },
  },
  env: {
    es6: true,
    node: true,
  },
  overrides: [
    {
      files: [
        "**/*.test.js",
      ],
      env: {
        jest: true,
      },
    },
  ],
}
