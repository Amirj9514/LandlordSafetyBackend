require('dotenv').config();
const { syncModels, User } = require('../models');
const { ROLES } = require('../constants/roles');
const { seed } = require('../config/env');

(async () => {
  try {
    if (!seed.superAdminEmail || !seed.superAdminPassword) {
      throw new Error('Set SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD in .env');
    }

    await syncModels({ alter: true });

    const email = seed.superAdminEmail.toLowerCase();
    const existing = await User.findOne({ where: { email } });

    if (existing) {
      console.log(`Super admin already exists: ${email}`);
      process.exit(0);
    }

    await User.create({
      email,
      password: seed.superAdminPassword,
      fullName: seed.superAdminFullName,
      role: ROLES.SUPER_ADMIN,
      phoneNumber: null,
      secondaryPhoneNumber: null,
      address: null,
      additionalData: {},
      isActive: true,
      createdBy: null,
      updatedBy: null,
    });

    console.log(`Super admin created: ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
})();
