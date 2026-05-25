const sequelize = require('../config/database');
const User = require('./User');
const ServiceCategory = require('./ServiceCategory');
const Service = require('./Service');
const ServiceQuestion = require('./ServiceQuestion');
const PricingTier = require('./PricingTier');
const PricingRule = require('./PricingRule');
const Bundle = require('./Bundle');
const Region = require('./Region');
const RegionPostalPrefix = require('./RegionPostalPrefix');
const RegionPrice = require('./RegionPrice');
const Booking = require('./Booking');
const BookingLineItem = require('./BookingLineItem');
const BookingAnswer = require('./BookingAnswer');
const QuoteRequest = require('./QuoteRequest');
const QuoteRequestAnswer = require('./QuoteRequestAnswer');
const Quotation = require('./Quotation');
const QuotationLineItem = require('./QuotationLineItem');
const QuotationAnswer = require('./QuotationAnswer');
const Invoice = require('./Invoice');

ServiceCategory.hasMany(Service, { foreignKey: 'categoryId', as: 'services' });
Service.belongsTo(ServiceCategory, { foreignKey: 'categoryId', as: 'category' });
Service.belongsTo(Service, { foreignKey: 'parentServiceId', as: 'parent' });
Service.hasMany(Service, { foreignKey: 'parentServiceId', as: 'children' });
Service.hasMany(ServiceQuestion, { foreignKey: 'serviceId', as: 'questions' });
ServiceQuestion.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
Service.hasMany(PricingTier, { foreignKey: 'serviceId', as: 'pricingTiers' });
PricingTier.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
PricingRule.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

Region.hasMany(RegionPostalPrefix, { foreignKey: 'regionId', as: 'prefixes' });
RegionPostalPrefix.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });
Region.hasMany(RegionPrice, { foreignKey: 'regionId', as: 'prices' });
RegionPrice.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });
RegionPrice.belongsTo(PricingTier, { foreignKey: 'pricingTierId', as: 'pricingTier' });
PricingTier.hasMany(RegionPrice, { foreignKey: 'pricingTierId', as: 'regionPrices' });

Booking.belongsTo(Region, { foreignKey: 'resolvedRegionId', as: 'resolvedRegion' });
Booking.belongsTo(User, { foreignKey: 'technicianId', as: 'technician' });
Booking.hasMany(BookingLineItem, { foreignKey: 'bookingId', as: 'lineItems' });
BookingLineItem.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });
Booking.hasMany(BookingAnswer, { foreignKey: 'bookingId', as: 'answers' });
BookingAnswer.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });
Booking.hasOne(Invoice, { foreignKey: 'bookingId', as: 'invoice' });
Invoice.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

QuoteRequest.belongsTo(Region, { foreignKey: 'resolvedRegionId', as: 'resolvedRegion' });
QuoteRequest.hasMany(QuoteRequestAnswer, { foreignKey: 'quoteRequestId', as: 'answers' });
QuoteRequestAnswer.belongsTo(QuoteRequest, { foreignKey: 'quoteRequestId', as: 'quoteRequest' });

Quotation.belongsTo(Region, { foreignKey: 'resolvedRegionId', as: 'resolvedRegion' });
Quotation.belongsTo(Booking, { foreignKey: 'convertedBookingId', as: 'convertedBooking' });
Quotation.hasMany(QuotationLineItem, { foreignKey: 'quotationId', as: 'lineItems' });
QuotationLineItem.belongsTo(Quotation, { foreignKey: 'quotationId', as: 'quotation' });
Quotation.hasMany(QuotationAnswer, { foreignKey: 'quotationId', as: 'answers' });
QuotationAnswer.belongsTo(Quotation, { foreignKey: 'quotationId', as: 'quotation' });

const models = {
  User,
  ServiceCategory,
  Service,
  ServiceQuestion,
  PricingTier,
  PricingRule,
  Bundle,
  Region,
  RegionPostalPrefix,
  RegionPrice,
  Booking,
  BookingLineItem,
  BookingAnswer,
  QuoteRequest,
  QuoteRequestAnswer,
  Quotation,
  QuotationLineItem,
  QuotationAnswer,
  Invoice,
};

const syncModels = async (options = {}) => {
  await sequelize.authenticate();
  await sequelize.sync(options);
};

module.exports = {
  sequelize,
  models,
  User,
  ServiceCategory,
  Service,
  ServiceQuestion,
  PricingTier,
  PricingRule,
  Bundle,
  Region,
  RegionPostalPrefix,
  RegionPrice,
  Booking,
  BookingLineItem,
  BookingAnswer,
  QuoteRequest,
  QuoteRequestAnswer,
  Quotation,
  QuotationLineItem,
  QuotationAnswer,
  Invoice,
  syncModels,
};
