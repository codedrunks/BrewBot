module.exports = {
    root: true,
    env: {
        "commonjs": true,
        "es2021": true,
        "node": true,
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    plugins: [
        "@typescript-eslint",
    ],
    ignorePatterns: [
        "out/**",
        "test.*",
    ],
    rules: {
        "quotes": [ "error" , "double" ],
        "semi": [ "error" , "always" ],
        "comma-dangle": [ "error" , "always-multiline" ],
        "array-bracket-newline": [ "error", "consistent" ],
        "function-paren-newline": [ "error", "multiline" ],
        "no-control-regex": ["off"],
        "eol-last": [ "error", "always" ],
        "no-async-promise-executor": "off",
        // see https://github.com/eslint/eslint/issues/14538#issuecomment-862280037
        "indent": ["error", 4, { "ignoredNodes": ["VariableDeclaration[declarations.length=0]"] }],
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-unused-vars": ["warn", { "ignoreRestSiblings": true, "argsIgnorePattern": "^_" }],
    },
};
