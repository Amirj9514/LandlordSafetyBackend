const express = require('express');
const publicRoutes = require('./public.routes');
const userRoutes = require('./user.routes');
const catalogRoutes = require('./catalog.routes');
const quoteRoutes = require('./quote.routes');
const bookingRoutes = require('./booking.routes');
const regionRoutes = require('./region.routes');
const quotationRoutes = require('./quotation.routes');
const dashboardRoutes = require('./dashboard.routes');
const adminCatalogRoutes = require('./admin/catalog.routes');
const adminBookingRoutes = require('./admin/booking.routes');
const notificationRoutes = require('./notification.routes');
const leadRoutes = require('./lead.routes');

const router = express.Router();

router.use('/', publicRoutes);
router.use('/catalog', catalogRoutes);
router.use('/quotes', quoteRoutes);
router.use('/bookings', bookingRoutes);
router.use('/regions', regionRoutes);
router.use('/quotations', quotationRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin/catalog', adminCatalogRoutes);
router.use('/admin/bookings', adminBookingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/leads', leadRoutes);

module.exports = router;
