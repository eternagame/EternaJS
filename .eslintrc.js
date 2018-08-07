module.exports = {
    "extends": "airbnb-base",
     "parser": "typescript-eslint-parser",
     "plugins": [
         "typescript"
     ],
     // Some imports may be resolved via webpack aliases
    'settings': {
        'import/resolver': {
          'webpack': {
            'config': 'webpack.common.js'
          }
        }
    },
    'rules': {
        // Don't bug out due to TypeScript
        'no-undef': 'off',
        'typescript/no-unused-vars': 'error',
        // These aren't really a big issue and used well keep our code cleaner
        'no-bitwise': 'off',
        'no-continue': 'off',
        'no-plusplus': 'off',
        'no-underscore-dangle': 'off',
        // We like using for..of statements, so we have to redefine with everything else via the airbnb config (https://github.com/airbnb/javascript/blob/a510095acf20e3d96a94e6d0d0b26cfac71d2c7f/packages/eslint-config-airbnb-base/rules/style.js#L334)
        'no-restricted-syntax': [
            'error',
            {
              selector: 'ForInStatement',
              message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
            },
            {
              selector: 'LabeledStatement',
              message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
            },
            {
              selector: 'WithStatement',
              message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
            },
        ],
        // For everything here on out, keep at least for now, so as not to cause issues/slow down while porting.
        // Discuss/review these later for final determinations
        'indent': ['error', 4],
        'camelcase': 'off',
        'quotes': ['error', 'double'],
        'object-curly-spacing': ['error', 'never'],
        'prefer-const': 'off',
        'lines-between-class-members': ['error', 'always', {exceptAfterSingleLine: true}],
        'comma-dangle': ['error', 'never'],
        'max-len': ['error', {code: 120}],
        'no-else-return': 'off',
        // At least until the dynamic content changes to interfaces
        'dot-notation': 'off',
        // Outparams are used in some places to reduce allocations, however it'd be nice to have in general...
        // Should probably reconfigure with ignorePropertyModificationsFor
        'no-param-reassign': 'off',
        // This is currently broken https://github.com/benmosher/eslint-plugin-import/issues/1152
        'import/order': 'off',
        // We use subclasses, so this rule frequently throws up false positives
        'class-methods-use-this': 'off',
    }
};
