const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class PricingRule extends Model {}

PricingRule.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ruleKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'rule_key',
    },
    ruleType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'rule_type',
    },
    scope: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'service_line',
    },
    serviceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'service_id',
    },
    bundleId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'bundle_id',
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
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
    modelName: 'PricingRule',
    tableName: 'pricing_rules',
    underscored: true,
    timestamps: true,
  }
);

module.exports = PricingRule;
