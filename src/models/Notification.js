const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Notification extends Model {}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    bookingId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'booking_id',
    },
    activityId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'activity_id',
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read',
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = Notification;
