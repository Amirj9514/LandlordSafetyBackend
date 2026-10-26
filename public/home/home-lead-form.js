(function () {
  const API = '/api/leads';
  // Same rules and messages as src/utils/contactParser.js (the server checks them again).
  var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var UK_PHONE_REGEX = /^(?:\+44|0)(?:7\d{9}|[123]\d{8,9})$/;
  var MESSAGES = {
    required: 'Please enter an email or phone number',
    email: 'Please enter a valid email address',
    phone: 'Please enter a valid UK phone number',
  };
  const form = document.querySelector('.quote-form');
  if (!form) return;

  var feedback = document.createElement('p');
  feedback.className = 'quote-form__feedback';
  feedback.setAttribute('role', 'status');
  feedback.hidden = true;
  form.insertBefore(feedback, form.firstChild);

  var submitBtn = form.querySelector('button[type="submit"]');
  var submitLabel = submitBtn ? submitBtn.querySelector('.btn-primary__label') : null;
  var defaultSubmitLabel = submitLabel ? submitLabel.textContent.trim() : 'Book Now';

  var emailInput = form.querySelector('#quote-email');
  var phoneInput = form.querySelector('#quote-phone');
  var phoneField = form.querySelector('#quote-phone-field');
  var addPhoneBtn = form.querySelector('#quote-add-phone');
  var removePhoneBtn = form.querySelector('#quote-remove-phone');
  var emailReq = form.querySelector('#quote-email-req');
  var errorEls = {
    email: form.querySelector('#quote-email-error'),
    phone: form.querySelector('#quote-phone-error'),
  };
  var inputs = { email: emailInput, phone: phoneInput };

  function setFeedback(type, message) {
    feedback.hidden = false;
    feedback.className = 'quote-form__feedback quote-form__feedback--' + type;
    feedback.textContent = message;
  }

  function clearFeedback() {
    feedback.hidden = true;
    feedback.textContent = '';
    feedback.className = 'quote-form__feedback';
  }

  function getPropertyType() {
    var selected = form.querySelector('input[name="property-type"]:checked');
    return selected ? selected.value : null;
  }

  function isPhoneOpen() {
    return Boolean(phoneField && !phoneField.hidden);
  }

  function emailValue() {
    return emailInput ? emailInput.value.trim() : '';
  }

  // The phone only counts while its field is open; Remove clears it anyway.
  function phoneValue() {
    return isPhoneOpen() && phoneInput ? phoneInput.value.trim() : '';
  }

  // Spaced UK format as on the Book Now form: 07xxx xxxxxx, 020 xxxx xxxx, +44 7xxx xxxxxx.
  function formatPhone(raw) {
    var text = String(raw || '').trim();
    if (!text || /^\+(4(4)?)?$/.test(text)) return text;
    var s = text.replace(/[^\d+]/g, '');
    var intl = false;
    if (s.indexOf('+44') === 0) { s = '0' + s.slice(3).replace(/^0/, ''); intl = true; }
    else if (s.indexOf('0044') === 0) { s = '0' + s.slice(4).replace(/^0/, ''); intl = true; }
    s = s.replace(/\+/g, '');
    if (!s) return text;
    var sizes;
    if (/^07/.test(s)) sizes = intl ? [4, 6] : [5, 6];
    else if (/^02/.test(s)) sizes = intl ? [2, 4, 4] : [3, 4, 4];
    else if (/^03/.test(s)) sizes = intl ? [3, 3, 4] : [4, 3, 4];
    else sizes = intl ? [4, 6] : [5, 6];
    var digits = intl ? s.slice(1) : s;
    var out = [];
    var i = 0;
    sizes.forEach(function (n) { if (i < digits.length) { out.push(digits.slice(i, i + n)); i += n; } });
    if (i < digits.length) out.push(digits.slice(i));
    return (intl ? '+44 ' : '') + out.join(' ');
  }

  // Email * only while no phone number has been entered.
  function updateEmailStar() {
    if (emailReq) emailReq.hidden = Boolean(phoneValue());
  }

  function isValidUkPhone(value) {
    return UK_PHONE_REGEX.test(value.replace(/\s+/g, '').replace(/^\+44\(0\)/, '+44'));
  }

  // Errors for the current values: at least one of email or phone, and each given value valid.
  function contactErrors() {
    var email = emailValue();
    var phone = phoneValue();
    var errors = {};
    if (!email && !phone) errors.email = MESSAGES.required;
    else if (email && !EMAIL_REGEX.test(email)) errors.email = MESSAGES.email;
    if (phone && !isValidUkPhone(phone)) errors.phone = MESSAGES.phone;
    return errors;
  }

  function showError(field, message) {
    var el = errorEls[field];
    var input = inputs[field];
    if (!el || !input) return;
    el.textContent = message || '';
    el.hidden = !message;
    input.classList.toggle('field-input--invalid', Boolean(message));
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function isShowingError(field) {
    return Boolean(errorEls[field] && !errorEls[field].hidden);
  }

  // Show the given fields' errors (on blur / submit). Errors already on screen always refresh,
  // so they clear the moment the input is fixed.
  // "Both empty" only counts once Book Now has been clicked; before that, errors come from typed values only.
  var submitAttempted = false;

  function refreshErrors(fieldsToShow) {
    var errors = contactErrors();
    if (!submitAttempted && errors.email === MESSAGES.required) errors.email = '';
    ['email', 'phone'].forEach(function (field) {
      if (fieldsToShow.indexOf(field) !== -1 || isShowingError(field)) showError(field, errors[field]);
    });
    return errors;
  }

  function isFormComplete() {
    var postcodeEl = form.querySelector('#postcode');
    var postcode = postcodeEl ? postcodeEl.value.trim() : '';
    return Boolean(postcode && (emailValue() || phoneValue()) && getPropertyType());
  }

  function updateSubmitState() {
    if (!submitBtn) return;
    var busy = form.classList.contains('quote-form--loading');
    submitBtn.disabled = busy || !isFormComplete();
  }

  function setFormBusy(isBusy) {
    form.classList.toggle('quote-form--loading', isBusy);
    form.querySelectorAll('input, button, select, textarea').forEach(function (el) {
      if (el === submitBtn) return;
      el.disabled = isBusy;
    });
    if (submitBtn) {
      submitBtn.classList.toggle('is-loading', isBusy);
      submitBtn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    }
    if (submitLabel) {
      submitLabel.textContent = isBusy ? 'Submitting' : defaultSubmitLabel;
    }
    updateSubmitState();
  }

  function setPhoneOpen(open) {
    if (!phoneField) return;
    phoneField.hidden = !open;
    if (addPhoneBtn) {
      addPhoneBtn.hidden = open;
      addPhoneBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (!open && phoneInput) {
      phoneInput.value = '';
      showError('phone', '');
    }
    updateEmailStar();
    refreshErrors([]);
    updateSubmitState();
  }

  if (addPhoneBtn) {
    addPhoneBtn.addEventListener('click', function () {
      setPhoneOpen(true);
      if (phoneInput) phoneInput.focus();
    });
  }

  if (removePhoneBtn) {
    removePhoneBtn.addEventListener('click', function () {
      setPhoneOpen(false);
      if (emailInput) emailInput.focus();
    });
  }

  // Leaving a field shows its error, but not while moving between the contact controls
  // (e.g. from an empty Email to "+ Add Phone"), so the "required" message doesn't flash.
  function isContactControl(el) {
    return el === emailInput || el === phoneInput || el === addPhoneBtn || el === removePhoneBtn;
  }

  if (emailInput) {
    emailInput.addEventListener('blur', function () {
      refreshErrors(emailValue() ? ['email'] : []);
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      if (phoneInput.selectionStart === phoneInput.value.length) {
        var next = formatPhone(phoneInput.value);
        if (next !== phoneInput.value) phoneInput.value = next;
      }
      updateEmailStar();
    });
    phoneInput.addEventListener('blur', function (event) {
      phoneInput.value = formatPhone(phoneInput.value);
      updateEmailStar();
      refreshErrors(phoneValue() ? ['phone'] : []);
    });
  }

  form.addEventListener('input', function (event) {
    if (event.target === emailInput || event.target === phoneInput) refreshErrors([]);
    updateSubmitState();
  });
  form.addEventListener('change', updateSubmitState);
  updateSubmitState();

  // Coming back from the booking page via Back restores this page from cache: unlock the form.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      setFormBusy(false);
      submitAttempted = false;
      refreshErrors([]);
      showError('email', '');
      showError('phone', '');
    }
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearFeedback();

    var postcode = form.querySelector('#postcode')?.value?.trim() || '';
    var propertyType = getPropertyType();
    submitAttempted = true;
    var errors = refreshErrors(['email', 'phone']);

    if (errors.email || errors.phone) {
      var first = errors.email ? emailInput : phoneInput;
      if (first) first.focus();
      return;
    }

    if (!postcode || !propertyType) {
      setFeedback('error', 'Please fill in postcode and property type.');
      return;
    }

    var email = emailValue();
    var phone = phoneValue();

    setFormBusy(true);

    // Record the lead in the background (keepalive survives the page change); the booking
    // page doesn't wait on it, so a slow or failed save never blocks the visitor.
    try {
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcode: postcode, propertyType: propertyType, email: email, phone: phone }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {
      // Ignore: going to the booking page matters more than the lead record.
    }

    // Continue on the booking page with these details already filled in.
    var params = new URLSearchParams();
    params.set('propertyType', propertyType);
    params.set('postcode', postcode.toUpperCase().replace(/\s+/g, ' '));
    if (email) params.set('email', email);
    if (phone) params.set('phone', phone.replace(/\s+/g, ' '));
    window.location.href = '/book-now/?' + params.toString();
  });
})();
