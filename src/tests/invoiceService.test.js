if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-key-min-32-chars-long';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { INVOICE_STATUS } = require('../constants/invoiceStatus');
const { createInvoiceService, buildInvoiceSourceHash } = require('../services/invoice.service');

const createRecord = (data) => ({
  ...data,
  async update(values) {
    Object.assign(this, values);
    return this;
  },
  get() {
    return { ...this };
  },
});

const createBookingFixture = () => ({
  id: 'booking-1',
  reference: 'BK-ABC123',
  firstName: 'Amir',
  lastName: 'Javed',
  email: 'amir@example.com',
  phone: '0123456789',
  postcode: 'AB1 2CD',
  appointmentAddress: '221B Baker Street',
  preferredDate: '2026-05-26',
  preferredTimeSlot: 'morning',
  paymentStatus: 'unpaid',
  subtotal: '100.00',
  vat: '20.00',
  total: '120.00',
  comment: 'Ring the bell on arrival',
  lineItems: [
    {
      description: 'Gas Safety Check',
      subDescription: 'CP12 certificate',
      quantity: 1,
      unitPrice: '100.00',
      total: '100.00',
      sortOrder: 0,
    },
  ],
});

describe('invoice.service', () => {
  it('reuses an existing stored invoice for download', async () => {
    const bookingData = createBookingFixture();
    const sourceHash = buildInvoiceSourceHash(bookingData);
    const invoice = createRecord({
      id: 'invoice-1',
      bookingId: bookingData.id,
      reference: 'IV-ABC123',
      status: INVOICE_STATUS.READY,
      storageKey: 'invoices/2026/05/IV-ABC123.pdf',
      fileName: 'IV-ABC123.pdf',
      mimeType: 'application/pdf',
      sourceHash,
      metadata: {},
    });
    const booking = createRecord({ ...bookingData, invoice });

    const service = createInvoiceService({
      models: {
        Booking: { findByPk: async () => booking },
        Invoice: { create: async () => assert.fail('Invoice.create should not be called') },
      },
      storage: {
        invoiceFileExists: async () => true,
        readInvoiceFile: async () => Buffer.from('cached pdf'),
        writeInvoiceFile: async () => assert.fail('writeInvoiceFile should not be called'),
      },
      pdfService: {
        generateInvoicePdf: async () => assert.fail('generateInvoicePdf should not be called'),
      },
      allocateInvoiceReference: async () => 'IV-UNUSED1',
    });

    const payload = await service.getInvoiceDownloadPayload(booking.id);

    assert.equal(payload.buffer.toString(), 'cached pdf');
    assert.equal(payload.fileName, 'IV-ABC123.pdf');
    assert.equal(payload.invoice.actionType, 'download');
  });

  it('regenerates an invoice when the stored file is missing', async () => {
    const bookingData = createBookingFixture();
    const sourceHash = buildInvoiceSourceHash(bookingData);
    const invoice = createRecord({
      id: 'invoice-2',
      bookingId: bookingData.id,
      reference: 'IV-OLD123',
      status: INVOICE_STATUS.READY,
      storageKey: 'invoices/2026/05/IV-OLD123.pdf',
      fileName: 'IV-OLD123.pdf',
      mimeType: 'application/pdf',
      sourceHash,
      metadata: {},
    });
    const booking = createRecord({ ...bookingData, invoice });

    let generatedCount = 0;
    let writeCount = 0;

    const service = createInvoiceService({
      models: {
        Booking: { findByPk: async () => booking },
        Invoice: { create: async () => assert.fail('Invoice.create should not be called') },
      },
      storage: {
        invoiceFileExists: async () => false,
        readInvoiceFile: async () => Buffer.from('fresh pdf'),
        writeInvoiceFile: async () => {
          writeCount += 1;
          return {
            storageKey: 'invoices/2026/05/IV-OLD123.pdf',
            absolutePath: 'C:/tmp/IV-OLD123.pdf',
            byteSize: 9,
          };
        },
      },
      pdfService: {
        generateInvoicePdf: async () => {
          generatedCount += 1;
          return Buffer.from('fresh pdf');
        },
      },
      allocateInvoiceReference: async () => 'IV-UNUSED2',
    });

    const payload = await service.getInvoiceDownloadPayload(booking.id);

    assert.equal(generatedCount, 1);
    assert.equal(writeCount, 1);
    assert.equal(invoice.status, INVOICE_STATUS.READY);
    assert.equal(invoice.storageKey, 'invoices/2026/05/IV-OLD123.pdf');
    assert.equal(payload.buffer.toString(), 'fresh pdf');
  });
});
