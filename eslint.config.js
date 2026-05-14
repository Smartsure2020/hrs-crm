import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/lib/**/*", "src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
      // Prevent components/pages from reaching around the API to Supabase directly.
      // Data queries belong in /api routes (service_role). Auth session reads belong
      // in src/lib/. Add an override below for auth-flow pages that legitimately
      // need the Supabase client for OAuth callbacks and password flows.
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["**/supabaseClient", "@/lib/supabaseClient"],
          message: "Direct Supabase access is not allowed in components or pages. Route data queries through the API layer (/api/*). Supabase is only allowed in src/lib/ and auth-flow pages.",
        }],
      }],
    },
  },
  // Auth-flow pages that legitimately use the Supabase client (OAuth callback, password set).
  {
    files: ["src/pages/AuthCallback.jsx", "src/pages/SetPassword.jsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
