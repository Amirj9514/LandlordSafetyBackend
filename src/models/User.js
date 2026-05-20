const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const { ALL_ROLES, ROLES } = require('../constants/roles');

class User extends Model {
  async comparePassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
  }

  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'full_name',
    },
    role: {
      type: DataTypes.ENUM(...ALL_ROLES),
      allowNull: false,
      defaultValue: ROLES.TECHNICIAN,
    },
    phoneNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'phone_number',
    },
    secondaryPhoneNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'secondary_phone_number',
    },
    address: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    additionalData: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      field: 'additional_data',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updated_by',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
    },
  }
);

User.belongsTo(User, { as: 'creator', foreignKey: 'createdBy', constraints: false });
User.belongsTo(User, { as: 'updater', foreignKey: 'updatedBy', constraints: false });

module.exports = User;
