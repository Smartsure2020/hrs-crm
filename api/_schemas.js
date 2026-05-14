// Single source of truth lives in src/lib/schemas.js — importable by both
// the frontend (Vite, via @/lib/schemas) and the API (Node, via this re-export).
export { SCHEMAS } from '../src/lib/schemas.js';
