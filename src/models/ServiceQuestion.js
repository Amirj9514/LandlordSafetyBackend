const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ServiceQuestion extends Model {}

ServiceQuestion.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    serviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'service_id',
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
    conditionalLogic: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      field: 'conditional_logic',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },
    section: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'ServiceQuestion',
    tableName: 'service_questions',
    underscored: true,
    timestamps: true,
  }
);

module.exports = ServiceQuestion;
