const { Sequelize } = require('sequelize');
const { databaseUrl, dbLogging } = require('./env');

const needsSsl =
  databaseUrl.includes('render.com') ||
  databaseUrl.includes('aivencloud.com') ||
  /[?&]sslmode=(require|verify-ca|verify-full|no-verify)/i.test(databaseUrl);

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: dbLogging ? console.log : false,
  dialectOptions: needsSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
});

module.exports = sequelize;
