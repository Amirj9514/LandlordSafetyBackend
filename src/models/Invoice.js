const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { ALL_INVOICE_STATUSES, INVOICE_STATUS } = require('../constants/invoiceStatus');

class Invoice extends Model {}

Invoice.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'booking_id',
    },
    reference: {
      type: DataTypes.STRING(12),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(...ALL_INVOICE_STATUSES),
      allowNull: false,
      defaultValue: INVOICE_STATUS.GENERATING,
    },
    storageProvider: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'local',
      field: 'storage_provider',
    },
    storageKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'storage_key',
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'file_name',
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'application/pdf',
      field: 'mime_type',
    },
    byteSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'byte_size',
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'generated_at',
    },
    sourceHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'source_hash',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'Invoice',
    tableName: 'invoices',
    underscored: true,
    timestamps: true,
  }
);

module.exports = Invoice;
