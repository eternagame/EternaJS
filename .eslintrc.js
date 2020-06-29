module.exports = {
    'extends': ['airbnb-base', 'plugin:@typescript-eslint/recommended'],
    'parserOptions': {
      'project': './tsconfig.json'
    },
    'settings': {
        // Some imports may be resolved via webpack aliases
        'import/resolver': {
          'webpack': {
            'config': 'webpack.common.js'
          }
        }
    },
    'rules': {
        // Broken
        // This rule frequently throws up false positives with subclasses https://github.com/typescript-eslint/typescript-eslint/issues/52
        'class-methods-use-this': 'off',
        // Same with this one https://github.com/typescript-eslint/typescript-eslint/issues/586
        '@typescript-eslint/no-unused-vars': 'off',

        // Prefer typescript-eslint version
        'semi': 'off',
        '@typescript-eslint/semi': 'error',

        // Handled by typescript
        'no-dupe-class-members': 'off',
        'no-undef': 'off',

        // These aren't really a big issue and used well keep our code cleaner
        'no-bitwise': 'off',
        'no-continue': 'off',
        'no-plusplus': 'off',
        'no-underscore-dangle': 'off',
        'max-classes-per-file': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        'no-fallthrough': ['error', { "commentPattern": "break[\\s\\w]*omitted" }],
        '@typescript-eslint/no-use-before-define': ['error', {'classes': false}],
        // NOTE: Some are public but marked `/* internal */`, awaiting https://github.com/Microsoft/TypeScript/issues/5228
        '@typescript-eslint/explicit-member-accessibility': ['warn', {
          'overrides': {'constructors': 'no-public'}
        }],
        '@typescript-eslint/no-angle-bracket-type-assertion': 'off',
        '@typescript-eslint/explicit-function-return-type': ['off', {
          'allowTypedFunctionExpressions': true
        }],
        'no-constant-condition': ['error', { 'checkLoops': false }],
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

      // Stylistic preference
      'comma-dangle': ['error', 'never'],
      'indent': 'off',
      '@typescript-eslint/indent': ['error', 4],
      //'quotes': ['error', 'single'],
      'max-len': ['error', {
        'code': 120,
        'ignoreTemplateLiterals': true,
        'ignoreRegExpLiterals': true,
        'ignoreUrls': true
      }],
      'lines-between-class-members': ['error', 'always', {'exceptAfterSingleLine': true}],
      'object-curly-spacing': ['error', 'never'],
      // This can be more readable depending on the situation
      'no-else-return': 'off',
      // const should really be used to indicate that something *shouldn't* change, not just that it doesn't
      'prefer-const': 'off',
      // This would be great if it could pick up when we reassign multiple properties, but it's all sorts of
      // painful/less readable in a large number of of cases
      'prefer-destructuring': 'off',
      // In adition to stylistic preference, also prevents issues with the TS typechecker
      '@typescript-eslint/no-inferrable-types': ['error', {
        "ignoreParameters": true,
        "ignoreProperties": true,
      }],

      // Stuff to review, likely due to impending code changes
      // This isn't generally great practice, but a couple portions of our code benefit from this.
      'no-cond-assign': ['error', 'except-parens'],
      // At least until the dynamic content changes to interfaces
      'dot-notation': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Outparams are used in some places to reduce allocations, however it'd be nice to have in general...
      // Should probably reconfigure with ignorePropertyModificationsFor
      'no-param-reassign': 'off',


      // this became a problem recently because a default changed
      'import/extensions': ['error', 'never']
    }
  };
  
