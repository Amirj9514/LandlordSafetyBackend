require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  seed: {
    superAdminEmail: process.env.SEED_SUPER_ADMIN_EMAIL,
    superAdminPassword: process.env.SEED_SUPER_ADMIN_PASSWORD,
    superAdminFullName: process.env.SEED_SUPER_ADMIN_FULL_NAME || 'Super Admin',
  },
  vatEnabled: process.env.VAT_ENABLED === 'true',
  vatRate: parseFloat(process.env.VAT_RATE || '0.2', 10),
  dbLogging: process.env.DB_LOGGING === 'true',
  dbSyncAlter: process.env.DB_SYNC_ALTER === 'true',
};
