module.exports = [
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            parser: require('@typescript-eslint/parser')
        },
        rules: {
            'no-console': 'off'
        }
    }
];
