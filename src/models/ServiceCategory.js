const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ServiceCategory extends Model {}

ServiceCategory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    propertyType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'property_type',
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
    },
  },
  {
    sequelize,
    modelName: 'ServiceCategory',
    tableName: 'service_categories',
    underscored: true,
    timestamps: true,
  }
);

module.exports = ServiceCategory;
