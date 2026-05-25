const { Op } = require('sequelize');
const { User, Booking } = require('../models');
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

  const revenue = revenueRaw !== null ? parseFloat(revenueRaw) : 0;
  const vat = vatRaw !== null ? parseFloat(vatRaw) : 0;

  return {
    activeTechnicians: {
      count: technicians.length,
      technicians: technicians.map(toPublicUser),
    },
    pendingBookings,
    unpaidBookings,
    currentMonth: {
      year,
      month,
      label: start.toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
      completedBookings: completedThisMonth,
      revenue: Math.round(revenue * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      revenueIncludingVat: Math.round((revenue + vat) * 100) / 100,
    },
  };
};

module.exports = { getDashboardStats, getMonthRange };
