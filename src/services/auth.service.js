const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { jwt: jwtConfig } = require('../config/env');
const { toPublicUser } = require('../utils/userSerializer');

const generateToken = (user) =>
  jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );

const login = async (email, password) => {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });

  if (!user || !user.isActive) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const token = generateToken(user);

  return {
    token,
    user: toPublicUser(user),
  };
};

module.exports = { login, generateToken };
