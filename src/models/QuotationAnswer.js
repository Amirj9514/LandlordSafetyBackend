const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class QuotationAnswer extends Model {}

QuotationAnswer.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quotationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'quotation_id',
    },
    serviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'service_id',
    },
    serviceCode: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'service_code',
    },
    answers: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'QuotationAnswer',
    tableName: 'quotation_answers',
    underscored: true,
    timestamps: true,
  }
);

module.exports = QuotationAnswer;
