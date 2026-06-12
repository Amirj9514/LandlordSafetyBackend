const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class QuotationLineItem extends Model {}

QuotationLineItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quotationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'quotation_id',
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
    serviceName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'service_name',
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_notes',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },
    serviceDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      field: 'service_details',
    },
  },
  {
    sequelize,
    modelName: 'QuotationLineItem',
    tableName: 'quotation_line_items',
    underscored: true,
    timestamps: true,
  }
);

module.exports = QuotationLineItem;
