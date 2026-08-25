import js from '@eslint/js';
import neosEslintPlugin from '@neos21/neos-eslint-plugin';
import { defineConfig } from 'eslint/config';
import pluginImportX from 'eslint-plugin-import-x';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginTailwindcss from 'eslint-plugin-tailwindcss';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** ESLint 設定 */
export default defineConfig([
  // ベースルール
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: {
      js        : js,
      'import-x': pluginImportX
    },
    extends: ['js/recommended'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'import-x/order': [
        'error',
        {
          groups: [
            ['builtin', 'external'],
            ['internal'],
            ['parent', 'sibling', 'index'],
            ['type']
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true }
        }
      ]
    }
  },
  
  // TypeScript 向けルール
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/explicit-function-return-type': ['error', { allowIIFEs: true }]
    }
  },
  
  // オレオレルール
  neosEslintPlugin.configs.recommended,
  
  // React 向けルール
  {
    ...pluginReact.configs.flat.recommended,
    rules: {
      'react/react-in-jsx-scope': 'off'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    plugins: {
      'react-hooks': pluginReactHooks as unknown as Plugin
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/immutability': 'error'
    }
  },
  
  // TailwindCSS 向けルール : エラーが回避できないので `any` 化している
  (pluginTailwindcss.configs as unknown as any)['flat/recommended'] || pluginTailwindcss.configs.recommended,  // eslint-disable-line @typescript-eslint/no-explicit-any
  {
    settings: {
      // daisyUI を使っていることを認識させるため CSS ファイルパスを指定する
      tailwindcss: {
        cssConfigPath: './client/styles.css'
      }
    },
    rules: {
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-arbitrary-value': 'off',  // 幅などに数値を含めたクラス名を使いたいので切る
      'tailwindcss/no-custom-classname': 'warn',
      'tailwindcss/no-contradicting-classname': 'warn'
    }
  },
  
  // 検証しない除外ファイル
  {
    ignores: [
      'node_modules/**',
      '.wrangler/**',
      '.react-router/**',
      'build/**',
      'coverage/**',
      'worker-configuration.d.ts'
    ]
  }
]);
