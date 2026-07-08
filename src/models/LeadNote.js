const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class LeadNote extends Model {}

LeadNote.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    leadId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'lead_id',
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'author_id',
    },
    authorName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'author_name',
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'LeadNote',
    tableName: 'lead_notes',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = LeadNote;
