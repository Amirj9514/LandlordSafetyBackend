const toPublicUser = (user) => {
  if (!user) return null;

  const plain = user.get ? user.get({ plain: true }) : user;

  return {
    id: plain.id,
    email: plain.email,
    fullName: plain.fullName,
    role: plain.role,
    phoneNumber: plain.phoneNumber,
    secondaryPhoneNumber: plain.secondaryPhoneNumber,
    address: plain.address,
    additionalData: plain.additionalData,
    isActive: plain.isActive,
    createdBy: plain.createdBy,
    updatedBy: plain.updatedBy,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

module.exports = { toPublicUser };
