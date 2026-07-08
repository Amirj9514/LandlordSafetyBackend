const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { ALL_PROPERTY_TYPES } = require('../constants/propertyTypes');
const { ALL_LEAD_STATUSES, LEAD_STATUS } = require('../constants/leadStatus');
const { SUBMISSION_SOURCE } = require('../constants/submissionSource');

class Lead extends Model {}

Lead.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reference: {
      type: DataTypes.STRING(12),
      allowNull: true,
      unique: true,
    },
    postcode: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    propertyType: {
      type: DataTypes.ENUM(...ALL_PROPERTY_TYPES),
      allowNull: false,
      field: 'property_type',
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    contactType: {
      type: DataTypes.ENUM('email', 'phone'),
      allowNull: false,
      field: 'contact_type',
    },
    status: {
      type: DataTypes.ENUM(...ALL_LEAD_STATUSES),
      allowNull: false,
      defaultValue: LEAD_STATUS.NEW,
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: SUBMISSION_SOURCE.WEBSITE,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'Lead',
    tableName: 'leads',
    underscored: true,
    timestamps: true,
  }
);

module.exports = Lead;
