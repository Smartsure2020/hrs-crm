// Single source of truth lives in src/lib/permissions.js — importable by both
// the frontend (Vite, via @/lib/permissions) and the API (Node, via this re-export).
import { ROLES, ADMIN_ROLES } from '../src/lib/permissions.js';
export { ROLES, ADMIN_ROLES };
export const isAdminRole = (role) => ADMIN_ROLES.includes(role);
