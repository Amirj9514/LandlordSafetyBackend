const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { ALL_PROPERTY_TYPES, PRICING_MODES } = require('../constants/propertyTypes');

class Service extends Model {}

Service.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'category_id',
    },
    code: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    propertyType: {
      type: DataTypes.ENUM(...ALL_PROPERTY_TYPES),
      allowNull: false,
      field: 'property_type',
    },
    pricingMode: {
      type: DataTypes.ENUM(...Object.values(PRICING_MODES)),
      allowNull: false,
      defaultValue: PRICING_MODES.INSTANT,
      field: 'pricing_mode',
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
    },
    parentServiceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_service_id',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    modelName: 'Service',
    tableName: 'services',
    underscored: true,
    timestamps: true,
  }
);

module.exports = Service;
