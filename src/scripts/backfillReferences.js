require('dotenv').config();
const { Booking, Quotation } = require('../models');
const {
  allocateBookingReference,
  allocateQuotationReference,
} = require('../utils/referenceNumber');

const backfillModel = async (Model, allocator) => {
  const rows = await Model.findAll({ where: { reference: null } });
  let count = 0;
  for (const row of rows) {
    const reference = await allocator(Model);
    await row.update({ reference });
    count += 1;
    console.log(`  ${Model.name} ${row.id} → ${reference}`);
  }
  return count;
};

(async () => {
  try {
    console.log('Backfilling booking references…');
    const bookings = await backfillModel(Booking, allocateBookingReference);
    console.log(`Bookings updated: ${bookings}`);

    console.log('Backfilling quotation references…');
    const quotations = await backfillModel(Quotation, allocateQuotationReference);
    console.log(`Quotations updated: ${quotations}`);

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err.message);
    process.exit(1);
  }
})();
