const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { ALL_PROPERTY_TYPES } = require('../constants/propertyTypes');

class CatalogTopQuestion extends Model {}

CatalogTopQuestion.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    propertyType: {
      type: DataTypes.ENUM(...ALL_PROPERTY_TYPES),
      allowNull: false,
      field: 'property_type',
    },
    fieldKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'field_key',
    },
    inputType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'input_type',
    },
    label: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    options: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    validation: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
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
    modelName: 'CatalogTopQuestion',
    tableName: 'catalog_top_questions',
    underscored: true,
    timestamps: true,
  }
);

module.exports = CatalogTopQuestion;
