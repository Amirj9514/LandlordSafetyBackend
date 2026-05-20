require('dotenv').config();
const { syncModels } = require('../models');

(async () => {
  try {
    await syncModels({ alter: true });
    console.log('Database synced successfully');
    process.exit(0);
  } catch (error) {
    console.error('Database sync failed:', error.message);
    process.exit(1);
  }
})();
