const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s+().-]{7,20}$/;
// UK numbers: 07xxx xxxxxx mobiles, 01/02/03 landlines (e.g. 020 xxxx xxxx), or the same with +44
// instead of the leading 0 ("+44 (0)20 ..." is accepted too). Spaces are allowed anywhere.
const UK_PHONE_REGEX = /^(?:\+44|0)(?:7\d{9}|[123]\d{8,9})$/;

// Messages shown on the homepage quote form; public/home/home-lead-form.js uses the same rules and wording.
const CONTACT_MESSAGES = {
  required: 'Please enter an email or phone number',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid UK phone number',
};

const isValidEmail = (value) => EMAIL_REGEX.test(String(value || '').trim());

const isValidUkPhone = (value) => {
  const compact = String(value || '').trim().replace(/\s+/g, '').replace(/^\+44\(0\)/, '+44');
  return UK_PHONE_REGEX.test(compact);
};

// Legacy single "Email or Phone" field (kept for older cached copies of the quote form).
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

// Separate email and phone: at least one is required, and any value given must be valid.
// Falls back to the legacy `contact` field when neither is sent.
const parseContactFields = ({ email, phone, contact } = {}) => {
  const emailValue = String(email || '').trim();
  const phoneValue = String(phone || '').trim();

  if (!emailValue && !phoneValue && String(contact || '').trim()) {
    const legacy = parseContact(contact);
    return legacy.valid
      ? { ...legacy, errors: {} }
      : { ...legacy, errors: { contact: 'Contact must be a valid email address or phone number' } };
  }

  const errors = {};
  if (!emailValue && !phoneValue) errors.email = CONTACT_MESSAGES.required;
  if (emailValue && !isValidEmail(emailValue)) errors.email = CONTACT_MESSAGES.email;
  if (phoneValue && !isValidUkPhone(phoneValue)) errors.phone = CONTACT_MESSAGES.phone;

  const valid = Object.keys(errors).length === 0;
  return {
    email: valid && emailValue ? emailValue.toLowerCase() : null,
    phone: valid && phoneValue ? phoneValue.replace(/\s+/g, ' ') : null,
    contactType: valid ? (emailValue ? 'email' : 'phone') : null,
    valid,
    errors,
  };
};

module.exports = {
  CONTACT_MESSAGES,
  isValidEmail,
  isValidUkPhone,
  parseContact,
  isValidContact,
  parseContactFields,
};
