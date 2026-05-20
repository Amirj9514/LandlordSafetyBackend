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
    serviceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'service_id',
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
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
