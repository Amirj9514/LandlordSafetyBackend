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

module.exports = router;
