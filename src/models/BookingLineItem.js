const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class BookingLineItem extends Model {}

BookingLineItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'booking_id',
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    subDescription: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'sub_description',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'unit_price',
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    isTbc: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_tbc',
    },
    isDiscount: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_discount',
    },
    pricingTierId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'pricing_tier_id',
    },
    serviceCode: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'service_code',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },
  },
  {
    sequelize,
    modelName: 'BookingLineItem',
    tableName: 'booking_line_items',
    underscored: true,
    timestamps: true,
  }
);

module.exports = BookingLineItem;
