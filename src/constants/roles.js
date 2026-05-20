const ROLES = {
  SUPER_ADMIN: 'superAdmin',
  ADMIN: 'admin',
  TECHNICIAN: 'technician',
};

const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 3,
  [ROLES.ADMIN]: 2,
  [ROLES.TECHNICIAN]: 1,
};

const ALL_ROLES = Object.values(ROLES);

module.exports = { ROLES, ROLE_HIERARCHY, ALL_ROLES };
