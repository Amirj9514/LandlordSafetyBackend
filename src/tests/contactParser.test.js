const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseContact,
  isValidContact,
  isValidUkPhone,
  parseContactFields,
  CONTACT_MESSAGES,
} = require('../utils/contactParser');

describe('contactParser', () => {
  it('parses a valid email', () => {
    const result = parseContact('User@Example.com');
    assert.equal(result.valid, true);
    assert.equal(result.contactType, 'email');
    assert.equal(result.email, 'user@example.com');
    assert.equal(result.phone, null);
  });

  it('parses a valid phone number', () => {
    const result = parseContact('07700 900123');
    assert.equal(result.valid, true);
    assert.equal(result.contactType, 'phone');
    assert.equal(result.phone, '07700 900123');
    assert.equal(result.email, null);
  });

  it('rejects invalid contact values', () => {
    assert.equal(isValidContact('not-a-contact'), false);
    assert.equal(isValidContact(''), false);
  });
});

describe('isValidUkPhone', () => {
  it('accepts UK mobile, London and +44 formats with spaces', () => {
    for (const value of ['07700 900123', '07700900123', '020 7946 0958', '02079460958', '+44 7700 900123',
      '+447700900123', '+44 20 7946 0958', '+44 (0)20 7946 0958', '0161 496 0000']) {
      assert.equal(isValidUkPhone(value), true, value);
    }
  });

  it('rejects numbers that are not UK phone numbers', () => {
    for (const value of ['', '12345', '0770090012', '077009001234', '+1 202 555 0143', '08000 000000', 'phone', '07700-900-123']) {
      assert.equal(isValidUkPhone(value), false, value);
    }
  });
});

describe('parseContactFields', () => {
  it('accepts email only', () => {
    const result = parseContactFields({ email: ' Name@Domain.com ', phone: '' });
    assert.equal(result.valid, true);
    assert.equal(result.email, 'name@domain.com');
    assert.equal(result.phone, null);
    assert.equal(result.contactType, 'email');
  });

  it('accepts phone only, with no email error', () => {
    const result = parseContactFields({ email: '', phone: '07700  900123' });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, {});
    assert.equal(result.email, null);
    assert.equal(result.phone, '07700 900123');
    assert.equal(result.contactType, 'phone');
  });

  it('keeps both when both are valid', () => {
    const result = parseContactFields({ email: 'a@b.co', phone: '+44 20 7946 0958' });
    assert.equal(result.valid, true);
    assert.equal(result.email, 'a@b.co');
    assert.equal(result.phone, '+44 20 7946 0958');
    assert.equal(result.contactType, 'email');
  });

  it('requires at least one of email or phone', () => {
    const result = parseContactFields({ email: '  ', phone: '' });
    assert.equal(result.valid, false);
    assert.equal(result.errors.email, CONTACT_MESSAGES.required);
  });

  it('reports each invalid field separately', () => {
    const result = parseContactFields({ email: 'not-an-email', phone: '12345' });
    assert.equal(result.valid, false);
    assert.equal(result.errors.email, CONTACT_MESSAGES.email);
    assert.equal(result.errors.phone, CONTACT_MESSAGES.phone);
  });

  it('rejects an invalid phone even when the email is valid', () => {
    const result = parseContactFields({ email: 'a@b.co', phone: '999' });
    assert.equal(result.valid, false);
    assert.equal(result.errors.phone, CONTACT_MESSAGES.phone);
    assert.equal(result.errors.email, undefined);
  });

  it('still accepts the legacy single contact field', () => {
    const result = parseContactFields({ contact: '07700 900123' });
    assert.equal(result.valid, true);
    assert.equal(result.phone, '07700 900123');
    assert.equal(parseContactFields({ contact: 'nope' }).valid, false);
  });
});
