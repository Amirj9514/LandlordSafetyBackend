const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { ALL_PROPERTY_TYPES } = require('../constants/propertyTypes');

class QuoteRequest extends Model {}

QuoteRequest.init(
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
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'pending',
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name',
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    secondaryPhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'secondary_phone',
    },
    postcode: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    appointmentAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'appointment_address',
    },
    resolvedRegionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'resolved_region_id',
    },
    congestionZone: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'congestion_zone',
    },
    parkingAvailable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'parking_available',
    },
    preferredDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'preferred_date',
    },
    preferredTimeSlot: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'preferred_time_slot',
    },
    accessProvider: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'access_provider',
    },
    accessArrangements: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'access_arrangements',
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    commercialPropertySubtype: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'commercial_property_subtype',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'QuoteRequest',
    tableName: 'quote_requests',
    underscored: true,
    timestamps: true,
  }
);

module.exports = QuoteRequest;
