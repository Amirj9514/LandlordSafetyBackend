const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { ALL_PROPERTY_TYPES } = require('../constants/propertyTypes');

class Bundle extends Model {}

Bundle.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bundleKey: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      field: 'bundle_key',
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    propertyType: {
      type: DataTypes.ENUM(...ALL_PROPERTY_TYPES),
      allowNull: false,
      field: 'property_type',
    },
    serviceCodes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      field: 'service_codes',
    },
    discountTierKey: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'discount_tier_key',
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'discount_amount',
    },
    exclusionGroup: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'exclusion_group',
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'Bundle',
    tableName: 'bundles',
    underscored: true,
    timestamps: true,
  }
);

module.exports = Bundle;
