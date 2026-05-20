const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class BookingAnswer extends Model {}

BookingAnswer.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'booking_id',
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
    modelName: 'BookingAnswer',
    tableName: 'booking_answers',
    underscored: true,
    timestamps: true,
  }
);

module.exports = BookingAnswer;
