const { toPublicUser } = require('./userSerializer');
const { INVOICE_STATUS } = require('../constants/invoiceStatus');

const toPublicInvoiceSummary = (invoice) => {
  if (!invoice) {
    return {
      id: null,
      reference: null,
      status: null,
      exists: false,
      generatedAt: null,
      storageKey: null,
      canCreate: true,
      canDownload: false,
      canRegenerate: false,
      actionLabel: 'Create Invoice',
      actionType: 'create',
    };
  }
  const plain = invoice.get ? invoice.get({ plain: true }) : invoice;

  const exists = plain.status === INVOICE_STATUS.READY && Boolean(plain.storageKey);
  const canCreate = false;
  const canDownload = exists;
  const canRegenerate = [INVOICE_STATUS.FAILED, INVOICE_STATUS.MISSING].includes(plain.status);

  let actionLabel = 'Create Invoice';
  let actionType = 'create';

  if (canRegenerate) {
    actionLabel = 'Regenerate Invoice';
    actionType = 'regenerate';
  } else if (canDownload) {
    actionLabel = 'Download Invoice';
    actionType = 'download';
  } else if (plain.status === INVOICE_STATUS.GENERATING) {
    actionLabel = 'Invoice Generating';
    actionType = 'pending';
  }

  return {
    id: plain.id,
    reference: plain.reference,
    status: plain.status,
    exists,
    generatedAt: plain.generatedAt,
    storageKey: plain.storageKey || null,
    canCreate,
    canDownload,
    canRegenerate,
    actionLabel,
    actionType,
  };
};

const toPublicBooking = (booking) => {
  if (!booking) return null;
  const plain = booking.get ? booking.get({ plain: true }) : booking;

  return {
    ...plain,
    invoice: toPublicInvoiceSummary(plain.invoice),
    technician: plain.technician ? toPublicUser(plain.technician) : null,
  };
};

module.exports = { toPublicBooking, toPublicInvoiceSummary };
