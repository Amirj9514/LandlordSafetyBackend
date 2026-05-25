/**
 * Sets payment_status = 'unpaid' on bookings where it is null (pre-migration rows).
 * Run after db:sync: npm run db:backfill-payment-status
 */
require('dotenv').config();
const { sequelize } = require('../config/database');
const { PAYMENT_STATUS } = require('../constants/paymentStatus');

const run = async () => {
  const [, meta] = await sequelize.query(
    `UPDATE bookings
     SET payment_status = :unpaid
     WHERE payment_status IS NULL`,
    { replacements: { unpaid: PAYMENT_STATUS.UNPAID } }
  );
  const updated = meta?.rowCount ?? meta ?? 0;
  console.log(`Backfill complete: ${updated} booking(s) set to unpaid.`);
  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
