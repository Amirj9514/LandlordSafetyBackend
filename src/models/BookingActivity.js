const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { ALL_BOOKING_ACTIVITY_ACTIONS } = require('../constants/bookingActivity');

class BookingActivity extends Model {}

BookingActivity.init(
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
    actorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'actor_id',
    },
    actorName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'actor_name',
    },
    actorRole: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'actor_role',
    },
    action: {
      type: DataTypes.ENUM(...ALL_BOOKING_ACTIVITY_ACTIONS),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'BookingActivity',
    tableName: 'booking_activities',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = BookingActivity;
