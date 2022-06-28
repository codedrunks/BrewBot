module.exports = {
    env: {
        es6: true,
        node: true
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
    },
    plugins: [
        "@typescript-eslint"
    ],
    ignorePatterns: [
        "out/**"
    ],
    rules: {
        "quotes": [ "error", "double" ],
        "semi": [ "error", "always" ],
        "eol-last": [ "error", "always" ],
        "no-async-promise-executor": "off",
        // see https://github.com/eslint/eslint/issues/14538#issuecomment-862280037
        "indent": ["error", 4, { "ignoredNodes": ["VariableDeclaration[declarations.length=0]"] }]
    }
};
