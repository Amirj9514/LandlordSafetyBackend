const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PricingTier extends Model {}

PricingTier.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    serviceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'service_id',
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
    tierKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'tier_key',
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },
    isTbcByDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_tbc_by_default',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'PricingTier',
    tableName: 'pricing_tiers',
    underscored: true,
    timestamps: true,
  }
);

module.exports = PricingTier;
