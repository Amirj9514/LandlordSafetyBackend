const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { INVOICE_STATUS } = require('../constants/invoiceStatus');
const { toPublicBooking, toPublicInvoiceSummary } = require('../utils/bookingSerializer');

describe('bookingSerializer', () => {
  it('returns create invoice action when booking has no invoice', () => {
    const booking = toPublicBooking({
      id: 'booking-1',
      reference: 'BK-ABC123',
      technician: null,
      invoice: null,
    });

    assert.equal(booking.invoice.canCreate, true);
    assert.equal(booking.invoice.canDownload, false);
    assert.equal(booking.invoice.actionLabel, 'Create Invoice');
  });

  it('returns download action when invoice is ready', () => {
    const invoice = toPublicInvoiceSummary({
      id: 'invoice-1',
      reference: 'IV-ABC123',
      status: INVOICE_STATUS.READY,
      storageKey: 'invoices/2026/05/IV-ABC123.pdf',
      generatedAt: '2026-05-25T10:00:00.000Z',
    });

    assert.equal(invoice.exists, true);
    assert.equal(invoice.canDownload, true);
    assert.equal(invoice.actionType, 'download');
  });

  it('returns regenerate action when invoice is missing', () => {
    const invoice = toPublicInvoiceSummary({
      id: 'invoice-1',
      reference: 'IV-ABC123',
      status: INVOICE_STATUS.MISSING,
      storageKey: null,
      generatedAt: null,
    });

    assert.equal(invoice.canRegenerate, true);
    assert.equal(invoice.actionLabel, 'Regenerate Invoice');
  });
});
