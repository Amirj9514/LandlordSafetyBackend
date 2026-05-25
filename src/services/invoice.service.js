const crypto = require('crypto');
const { Invoice, Booking } = require('../models');
const { INVOICE_STATUS } = require('../constants/invoiceStatus');
const { allocateInvoiceReference } = require('../utils/referenceNumber');
const { toPublicInvoiceSummary } = require('../utils/bookingSerializer');
const storage = require('./invoiceStorage.service');
const pdfService = require('./invoicePdf.service');

const INVOICE_BOOKING_INCLUDE = [{ association: 'lineItems' }, { association: 'invoice' }];

const normalizeNumber = (value) => Number(value || 0);

const toPlain = (value) => (value?.get ? value.get({ plain: true }) : value);

const buildInvoiceSourceHash = (booking) => {
  const plain = toPlain(booking);
  const payload = {
    bookingId: plain.id,
    bookingReference: plain.reference,
    bookingStatus: plain.status,
    customer: {
      firstName: plain.firstName,
      lastName: plain.lastName,
      email: plain.email,
      phone: plain.phone,
      postcode: plain.postcode,
      appointmentAddress: plain.appointmentAddress,
    },
    paymentStatus: plain.paymentStatus,
    preferredDate: plain.preferredDate,
    preferredTimeSlot: plain.preferredTimeSlot,
    subtotal: plain.subtotal,
    vat: plain.vat,
    total: plain.total,
    lineItems: Array.isArray(plain.lineItems)
      ? plain.lineItems
          .map((line) => ({
            description: line.description,
            subDescription: line.subDescription,
            serviceName: line.serviceName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            total: line.total,
            sortOrder: line.sortOrder,
          }))
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      : [],
  };

  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

const buildInvoiceDocumentData = (booking, invoice, generatedAt = new Date()) => {
  const plainBooking = toPlain(booking);
  const plainInvoice = toPlain(invoice);

  return {
    reference: plainInvoice.reference,
    bookingReference: plainBooking.reference,
    bookingStatus: plainBooking.status,
    generatedAt,
    customerName: [plainBooking.firstName, plainBooking.lastName].filter(Boolean).join(' ').trim(),
    email: plainBooking.email,
    phone: plainBooking.phone,
    postcode: plainBooking.postcode,
    appointmentAddress: plainBooking.appointmentAddress,
    preferredDate: plainBooking.preferredDate,
    preferredTimeSlot: plainBooking.preferredTimeSlot,
    paymentStatus: plainBooking.paymentStatus,
    subtotal: normalizeNumber(plainBooking.subtotal),
    vat: normalizeNumber(plainBooking.vat),
    total: normalizeNumber(plainBooking.total),
    lineItems: Array.isArray(plainBooking.lineItems)
      ? plainBooking.lineItems
          .map((line) => ({
            description: line.description,
            subDescription: line.subDescription,
            serviceName: line.serviceName,
            quantity: line.quantity || 1,
            unitPrice: normalizeNumber(line.unitPrice),
            total: normalizeNumber(line.total),
            sortOrder: line.sortOrder || 0,
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      : [],
    notes: plainBooking.comment || plainBooking.adminNotes || '',
  };
};

const buildInvoiceUpdatePayload = ({ invoice, storageTarget, pdfBuffer, sourceHash, generatedAt, metadata }) => ({
  status: INVOICE_STATUS.READY,
  storageProvider: 'local',
  storageKey: storageTarget.storageKey,
  fileName: invoice.fileName || `${invoice.reference}.pdf`,
  mimeType: 'application/pdf',
  byteSize: pdfBuffer.length,
  generatedAt,
  sourceHash,
  metadata,
});

const shouldRegenerateInvoice = (invoice, sourceHash, { force = false } = {}) => {
  if (!invoice) return true;
  if (force) return true;
  if (!invoice.storageKey) return true;
  if (invoice.status !== INVOICE_STATUS.READY) return true;
  if (invoice.sourceHash !== sourceHash) return true;
  return false;
};

const createInvoiceService = (deps = {}) => {
  const models = deps.models || { Invoice, Booking };
  const invoiceStorage = deps.storage || storage;
  const invoicePdfService = deps.pdfService || pdfService;
  const allocateReference = deps.allocateInvoiceReference || allocateInvoiceReference;

  const loadBookingForInvoice = async (bookingId) => {
    const booking = await models.Booking.findByPk(bookingId, {
      include: INVOICE_BOOKING_INCLUDE,
    });

    if (!booking) {
      const error = new Error('Booking not found');
      error.status = 404;
      throw error;
    }

    return booking;
  };

  const ensureInvoiceRecord = async (booking) => {
    if (booking.invoice) return booking.invoice;

    return models.Invoice.create({
      bookingId: booking.id,
      reference: await allocateReference(models.Invoice),
      status: INVOICE_STATUS.GENERATING,
      storageProvider: 'local',
    });
  };

  const updateInvoiceFailure = async (invoice, errorMessage) => {
    await invoice.update({
      status: INVOICE_STATUS.FAILED,
      metadata: {
        ...(invoice.metadata || {}),
        lastFailureAt: new Date().toISOString(),
        lastFailureMessage: errorMessage,
      },
    });
  };

  const syncInvoiceAvailabilityStatus = async (invoice) => {
    if (!invoice || invoice.status !== INVOICE_STATUS.READY || !invoice.storageKey) return invoice;

    const exists = await invoiceStorage.invoiceFileExists(invoice.storageKey);
    if (exists) return invoice;

    await invoice.update({
      status: INVOICE_STATUS.MISSING,
      metadata: {
        ...(invoice.metadata || {}),
        lastMissingAt: new Date().toISOString(),
      },
    });

    return invoice;
  };

  const createOrRefreshInvoice = async (bookingId, { force = false, booking: providedBooking } = {}) => {
    const booking = providedBooking || (await loadBookingForInvoice(bookingId));
    let invoice = await ensureInvoiceRecord(booking);
    const sourceHash = buildInvoiceSourceHash(booking);

    await syncInvoiceAvailabilityStatus(invoice);
    invoice = booking.invoice || invoice;

    if (!shouldRegenerateInvoice(invoice, sourceHash, { force })) {
      return {
        invoice,
        generated: false,
      };
    }

    const generatedAt = new Date();

    try {
      await invoice.update({
        status: INVOICE_STATUS.GENERATING,
        metadata: {
          ...(invoice.metadata || {}),
          lastGenerationStartedAt: generatedAt.toISOString(),
        },
      });

      const documentData = buildInvoiceDocumentData(booking, invoice, generatedAt);
      const pdfBuffer = await invoicePdfService.generateInvoicePdf(documentData);
      const storageTarget = await invoiceStorage.writeInvoiceFile({
        reference: invoice.reference,
        generatedAt,
        fileName: `${invoice.reference}.pdf`,
        buffer: pdfBuffer,
      });

      const metadata = {
        ...(invoice.metadata || {}),
        lastGeneratedBookingReference: booking.reference,
        lastGenerationStartedAt: generatedAt.toISOString(),
      };

      await invoice.update(
        buildInvoiceUpdatePayload({
          invoice,
          storageTarget,
          pdfBuffer,
          sourceHash,
          generatedAt,
          metadata,
        })
      );

      return {
        invoice,
        generated: true,
      };
    } catch (error) {
      await updateInvoiceFailure(invoice, error.message);
      throw error;
    }
  };

  const getInvoiceMeta = async (bookingId) => {
    const booking = await loadBookingForInvoice(bookingId);
    if (!booking.invoice) return toPublicInvoiceSummary(null);

    const invoice = await syncInvoiceAvailabilityStatus(booking.invoice);
    return toPublicInvoiceSummary(invoice);
  };

  const getInvoiceDownloadPayload = async (bookingId) => {
    const booking = await loadBookingForInvoice(bookingId);
    let invoice = booking.invoice;
    const sourceHash = buildInvoiceSourceHash(booking);

    if (invoice) {
      invoice = await syncInvoiceAvailabilityStatus(invoice);
    }

    const needsGeneration =
      shouldRegenerateInvoice(invoice, sourceHash) ||
      !(invoice && invoice.storageKey && (await invoiceStorage.invoiceFileExists(invoice.storageKey)));

    if (needsGeneration) {
      const result = await createOrRefreshInvoice(bookingId, { force: true, booking });
      invoice = result.invoice;
    }

    const buffer = await invoiceStorage.readInvoiceFile(invoice.storageKey);
    return {
      buffer,
      contentType: invoice.mimeType || 'application/pdf',
      fileName: invoice.fileName || `${invoice.reference}.pdf`,
      invoice: toPublicInvoiceSummary(invoice),
    };
  };

  return {
    buildInvoiceSourceHash,
    buildInvoiceDocumentData,
    createOrRefreshInvoice,
    getInvoiceMeta,
    getInvoiceDownloadPayload,
    shouldRegenerateInvoice,
  };
};

const invoiceService = createInvoiceService();

module.exports = {
  ...invoiceService,
  createInvoiceService,
  buildInvoiceSourceHash,
  buildInvoiceDocumentData,
  shouldRegenerateInvoice,
};
