const app = require('./app');
const { port, nodeEnv, dbSyncAlter } = require('./config/env');
const { syncModels } = require('./models');

const start = async () => {
  try {
    await syncModels({ alter: dbSyncAlter });

    app.listen(port, () => {
      console.log(`Server running on port ${port} (${nodeEnv})`);
      console.log(`API base: http://localhost:${port}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();
