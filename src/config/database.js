const { Sequelize } = require('sequelize');
const { databaseUrl, dbLogging } = require('./env');

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: dbLogging ? console.log : false,
  dialectOptions: {
    ssl: databaseUrl.includes('render.com')
      ? { require: true, rejectUnauthorized: false }
      : false,
  },
});

module.exports = sequelize;
