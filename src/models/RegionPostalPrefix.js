const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class RegionPostalPrefix extends Model {}

RegionPostalPrefix.init(
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
    prefix: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'RegionPostalPrefix',
    tableName: 'region_postal_prefixes',
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['prefix'] },
      { fields: ['region_id'] },
    ],
  }
);

module.exports = RegionPostalPrefix;
