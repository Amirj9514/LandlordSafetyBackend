const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class RegionPrice extends Model {}

RegionPrice.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    regionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'region_id',
    },
    pricingTierId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'pricing_tier_id',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'RegionPrice',
    tableName: 'region_prices',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['region_id', 'pricing_tier_id'] }],
  }
);

module.exports = RegionPrice;
