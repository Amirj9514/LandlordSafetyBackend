(function () {
  const API = '/api/leads';
  // Same rules as src/utils/contactParser.js.
  var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_REGEX = /^[\d\s+().-]{7,20}$/;
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

  function isFormComplete() {
    var postcodeEl = form.querySelector('#postcode');
    var contactEl = form.querySelector('#contact');
    var postcode = postcodeEl ? postcodeEl.value.trim() : '';
    var contact = contactEl ? contactEl.value.trim() : '';
    return Boolean(postcode && contact && getPropertyType());
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

  form.addEventListener('input', updateSubmitState);
  form.addEventListener('change', updateSubmitState);
  updateSubmitState();

  // Coming back from the booking page via Back restores this page from cache: unlock the form.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) setFormBusy(false);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearFeedback();

    var postcode = form.querySelector('#postcode')?.value?.trim() || '';
    var contact = form.querySelector('#contact')?.value?.trim() || '';
    var propertyType = getPropertyType();

    if (!postcode || !contact || !propertyType) {
      setFeedback('error', 'Please fill in postcode, property type, and email or phone.');
      return;
    }

    var isEmail = EMAIL_REGEX.test(contact);
    if (!isEmail && !PHONE_REGEX.test(contact)) {
      setFeedback('error', 'Please enter a valid email address or phone number.');
      return;
    }

    setFormBusy(true);

    // Record the lead in the background (keepalive survives the page change); the booking
    // page doesn't wait on it, so a slow or failed save never blocks the visitor.
    try {
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcode: postcode, propertyType: propertyType, contact: contact }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {
      // Ignore: going to the booking page matters more than the lead record.
    }

    // Continue on the booking page with these details already filled in.
    var params = new URLSearchParams();
    params.set('propertyType', propertyType);
    params.set('postcode', postcode.toUpperCase().replace(/\s+/g, ' '));
    params.set(isEmail ? 'email' : 'phone', contact);
    window.location.href = '/book-now/?' + params.toString();
  });
})();
