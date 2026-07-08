const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s+().-]{7,20}$/;

const parseContact = (contact) => {
  const trimmed = String(contact || '').trim();
  if (!trimmed) {
    return { email: null, phone: null, contactType: null, valid: false };
  }

  if (EMAIL_REGEX.test(trimmed)) {
    return {
      email: trimmed.toLowerCase(),
      phone: null,
      contactType: 'email',
      valid: true,
    };
  }

  const normalizedPhone = trimmed.replace(/\s+/g, ' ').trim();
  if (PHONE_REGEX.test(normalizedPhone)) {
    return {
      email: null,
      phone: normalizedPhone,
      contactType: 'phone',
      valid: true,
    };
  }

  return { email: null, phone: null, contactType: null, valid: false };
};

const isValidContact = (contact) => parseContact(contact).valid;

module.exports = {
  parseContact,
  isValidContact,
};
