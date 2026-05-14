export const ROLES = Object.freeze({
  ADMIN:       'admin',
  ADMIN_STAFF: 'admin_staff',
  BROKER:      'broker',
});

export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.ADMIN_STAFF];
export const isAdminRole  = (role) => ADMIN_ROLES.includes(role);
