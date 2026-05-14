export const ROLES = Object.freeze({
  ADMIN:       'admin',
  ADMIN_STAFF: 'admin_staff',
  BROKER:      'broker',
});

export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.ADMIN_STAFF];

export const perms = {
  isAdmin:         (u) => u?.role === ROLES.ADMIN,
  isAdminStaff:    (u) => u?.role === ROLES.ADMIN_STAFF,
  isBroker:        (u) => u?.role === ROLES.BROKER,
  canSeeAll:       (u) => ADMIN_ROLES.includes(u?.role),
  canImportExport: (u) => u?.role === ROLES.ADMIN,
};
