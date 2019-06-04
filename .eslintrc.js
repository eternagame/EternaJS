module.exports = {
    'extends': ['airbnb-base', 'plugin:@typescript-eslint/recommended'],
    'parser': '@typescript-eslint/parser',
    'parserOptions': {
      'project': './tsconfig.json'
    },
    'plugins': [
        '@typescript-eslint'
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
        // This rule frequently throws up false positives with subclasses https://github.com/typescript-eslint/typescript-eslint/issues/52
        'class-methods-use-this': 'off',
        // Same with this one https://github.com/typescript-eslint/typescript-eslint/issues/586
        '@typescript-eslint/no-unused-vars': 'off',
        // Don't bug out due to TypeScript
        'no-undef': 'off',
        // typescript-eslint handles this one
        'no-use-before-define': 'off',
        // These aren't really a big issue and used well keep our code cleaner
        'no-bitwise': 'off',
        'no-continue': 'off',
        'no-plusplus': 'off',
        'no-underscore-dangle': 'off',
        '@typescript-eslint/no-use-before-define': ['error', {'classes': false}],
        // Additionally, only use warn since internal members are marked without modifiers, since internal doesn't exist yet https://github.com/Microsoft/TypeScript/issues/5228
        '@typescript-eslint/explicit-member-accessibility': ['warn', {
          "accessibility": "explicit",
          'overrides': {'constructors': 'no-public'}
        }],
        '@typescript-eslint/no-angle-bracket-type-assertion': 'off',
        // We like using for..of statements, so we have to redefine with everything else via the airbnb config (https://github.com/airbnb/javascript/blob/a510095acf20e3d96a94e6d0d0b26cfac71d2c7f/packages/eslint-config-airbnb-base/rules/style.js#L334)
        'no-restricted-syntax': ['error',
            {
              'selector': 'ForInStatement',
              'message': 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
            },
            {
              'selector': 'LabeledStatement',
              'message': 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
            },
            {
              'selector': 'WithStatement',
              'message': '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
            },
        ],
        // For everything here on out, keep at least for now, so as not to cause issues/slow down while porting.
        // Discuss/review these later for final determinations
        'indent': ['error', 4],
        'camelcase': 'off',
        'quotes': ['error', 'double'],
        'object-curly-spacing': ['error', 'never'],
        'prefer-const': 'off',
        'lines-between-class-members': ['error', 'always', {'exceptAfterSingleLine': true}],
        'comma-dangle': ['error', 'never'],
        'max-len': ['warn', {'code': 120}],
        'no-else-return': 'off',
        // At least until the dynamic content changes to interfaces
        'dot-notation': 'off',
        // Outparams are used in some places to reduce allocations, however it'd be nice to have in general...
        // Should probably reconfigure with ignorePropertyModificationsFor
        'no-param-reassign': 'off',
        // This is currently broken https://github.com/benmosher/eslint-plugin-import/issues/1152
        'import/order': 'off',
        // prefer-default-export hurts refactorability, and leads to style inconsistencies (enums can't be default-exported)
        'import/prefer-default-export': 'off',
    }
};
