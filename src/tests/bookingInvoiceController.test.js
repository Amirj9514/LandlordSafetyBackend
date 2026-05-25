if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/test';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-key-min-32-chars-long';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const httpStatus = require('../constants/httpStatus');
const bookingService = require('../services/booking.service');
const {
  createBookingInvoice,
  downloadBookingInvoice,
} = require('../controllers/booking.controller');

const invokeController = (controller, req) =>
  new Promise((resolve, reject) => {
    let statusCode = 200;
    const headers = {};

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ statusCode, payload, headers });
        return this;
      },
      send(body) {
        resolve({ statusCode, body, headers });
        return this;
      },
      setHeader(name, value) {
        headers[name] = value;
      },
    };

    controller(req, res, reject);
  });

describe('booking.controller invoice actions', () => {
  it('createBookingInvoice returns created response when invoice is generated', async () => {
    const original = bookingService.createBookingInvoice;
    bookingService.createBookingInvoice = async (_id, options) => {
      assert.equal(options.force, true);
      return {
        generated: true,
        invoice: {
          id: 'invoice-1',
          reference: 'IV-ABC123',
          actionType: 'download',
        },
      };
    };

    try {
      const result = await invokeController(createBookingInvoice, {
        params: { id: 'booking-1' },
        body: { force: true },
      });

      assert.equal(result.statusCode, httpStatus.CREATED);
      assert.equal(result.payload.success, true);
      assert.equal(result.payload.data.reference, 'IV-ABC123');
    } finally {
      bookingService.createBookingInvoice = original;
    }
  });

  it('downloadBookingInvoice streams pdf content with attachment headers', async () => {
    const original = bookingService.downloadBookingInvoice;
    bookingService.downloadBookingInvoice = async () => ({
      buffer: Buffer.from('invoice-pdf'),
      contentType: 'application/pdf',
      fileName: 'IV-ABC123.pdf',
    });

    try {
      const result = await invokeController(downloadBookingInvoice, {
        params: { id: 'booking-1' },
        body: {},
      });

      assert.equal(result.statusCode, httpStatus.OK);
      assert.equal(result.headers['Content-Type'], 'application/pdf');
      assert.equal(result.headers['Content-Disposition'], 'attachment; filename="IV-ABC123.pdf"');
      assert.equal(result.body.toString(), 'invoice-pdf');
    } finally {
      bookingService.downloadBookingInvoice = original;
    }
  });
});
