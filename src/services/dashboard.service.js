const { Op } = require('sequelize');
const { User, Booking, BookingLineItem, Quotation, Lead } = require('../models');
const { QUOTATION_STATUS } = require('../constants/quotationStatus');
const { LEAD_STATUS } = require('../constants/leadStatus');
const { ROLES } = require('../constants/roles');
const { BOOKING_STATUS } = require('../constants/bookingStatus');
const { PAYMENT_STATUS } = require('../constants/paymentStatus');
const { toPublicUser } = require('../utils/userSerializer');

const getMonthRange = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { year, month: month + 1, start, end };
};

// Names of the booking-level lines that are not a service (see the pricing rules seed).
const PRIORITY_SERVICE_LINE = 'Priority Service';
const TOP_SERVICES_LIMIT = 10;

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Splits the line items of paid bookings into per-service revenue and booking-level adjustments
 * (Priority Service, congestion, parking and bundle discounts, which carry no service code).
 * Pure function so it can be tested without a database.
 */
const summarizeLineItems = (lineItems = []) => {
  const byService = new Map();
  const adjustments = { priorityService: 0, otherCharges: 0, discounts: 0 };
  let priorityBookingIds = new Set();

  for (const line of lineItems) {
    if (line.isTbc || line.total === null || line.total === undefined) continue;
    const total = parseFloat(line.total);
    if (Number.isNaN(total)) continue;

    if (line.serviceCode) {
      const entry = byService.get(line.serviceCode) || {
        serviceCode: line.serviceCode,
        serviceName: line.serviceName || line.serviceCode,
        bookingIds: new Set(),
        revenue: 0,
      };
      entry.revenue += total;
      entry.bookingIds.add(line.bookingId);
      byService.set(line.serviceCode, entry);
    } else if (line.isDiscount || total < 0) {
      adjustments.discounts += total;
    } else if (line.description === PRIORITY_SERVICE_LINE) {
      adjustments.priorityService += total;
      priorityBookingIds.add(line.bookingId);
    } else {
      adjustments.otherCharges += total;
    }
  }

  const topServices = [...byService.values()]
    .map((e) => ({
      serviceCode: e.serviceCode,
      serviceName: e.serviceName,
      bookings: e.bookingIds.size,
      revenue: round2(e.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, TOP_SERVICES_LIMIT);

  return {
    topServices,
    adjustments: {
      priorityService: round2(adjustments.priorityService),
      otherCharges: round2(adjustments.otherCharges),
      discounts: round2(adjustments.discounts),
    },
    priorityServiceBookings: priorityBookingIds.size,
  };
};

const getDashboardStats = async () => {
  const { year, month, start, end } = getMonthRange();

  const technicians = await User.findAll({
    where: { role: ROLES.TECHNICIAN, isActive: true },
    attributes: ['id', 'email', 'fullName', 'role', 'phoneNumber', 'isActive'],
    order: [['fullName', 'ASC']],
  });

  const pendingBookings = await Booking.count({
    where: { status: BOOKING_STATUS.PENDING },
  });

  const unpaidBookings = await Booking.count({
    where: {
      paymentStatus: PAYMENT_STATUS.UNPAID,
      status: { [Op.ne]: BOOKING_STATUS.CANCELLED },
    },
  });

  const completedThisMonth = await Booking.count({
    where: {
      status: BOOKING_STATUS.COMPLETED,
      updatedAt: { [Op.between]: [start, end] },
    },
  });

  const paidRevenueWhere = {
    paymentStatus: PAYMENT_STATUS.PAID,
    paidAt: { [Op.between]: [start, end] },
    total: { [Op.ne]: null },
  };

  const revenueRaw = await Booking.sum('total', { where: paidRevenueWhere });

  const vatRaw = await Booking.sum('vat', {
    where: {
      ...paidRevenueWhere,
      vat: { [Op.ne]: null },
    },
  });

  const pendingQuotations = await Quotation.count({
    where: { status: QUOTATION_STATUS.PENDING },
  });

  const newLeads = await Lead.count({ where: { status: LEAD_STATUS.NEW } });

  const bookingsReceived = await Booking.count({
    where: {
      createdAt: { [Op.between]: [start, end] },
      status: { [Op.ne]: BOOKING_STATUS.CANCELLED },
    },
  });

  // Paid-this-month bookings, so the service breakdown adds up to the revenue shown above.
  const paidLineItems = await BookingLineItem.findAll({
    attributes: ['bookingId', 'description', 'serviceCode', 'serviceName', 'total', 'isTbc', 'isDiscount'],
    include: [{ model: Booking, as: 'booking', attributes: [], required: true, where: paidRevenueWhere }],
    raw: true,
  });
  const lineSummary = summarizeLineItems(paidLineItems);

  const revenue = revenueRaw !== null ? parseFloat(revenueRaw) : 0;
  const vat = vatRaw !== null ? parseFloat(vatRaw) : 0;

  return {
    activeTechnicians: {
      count: technicians.length,
      technicians: technicians.map(toPublicUser),
    },
    pendingBookings,
    unpaidBookings,
    pendingQuotations,
    newLeads,
    currentMonth: {
      year,
      month,
      label: start.toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
      completedBookings: completedThisMonth,
      bookingsReceived,
      priorityServiceBookings: lineSummary.priorityServiceBookings,
      topServices: lineSummary.topServices,
      adjustments: lineSummary.adjustments,
      revenue: Math.round(revenue * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      revenueIncludingVat: Math.round((revenue + vat) * 100) / 100,
    },
  };
};

module.exports = { getDashboardStats, getMonthRange, summarizeLineItems };
