import { defineConfig } from "eslint/config";
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  defineConfig([
    {
      rules: {
        "prettier/prettier": "error",
      },
      plugins: {
        tseslint: tseslint,
        prettier: prettier,
      },
      ignores: ['node_modules', 'dist', 'webpack.config.js', 'jest.setup.ts', 'jest.config.js', '.eslint.config.cjs', '*.scss.d.ts']
    },
  ])
);
