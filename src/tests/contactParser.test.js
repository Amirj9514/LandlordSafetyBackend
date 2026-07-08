const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseContact, isValidContact } = require('../utils/contactParser');

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
