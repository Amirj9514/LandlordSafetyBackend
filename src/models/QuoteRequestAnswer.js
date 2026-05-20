const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class QuoteRequestAnswer extends Model {}

QuoteRequestAnswer.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quoteRequestId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'quote_request_id',
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
    modelName: 'QuoteRequestAnswer',
    tableName: 'quote_request_answers',
    underscored: true,
    timestamps: true,
  }
);

module.exports = QuoteRequestAnswer;
