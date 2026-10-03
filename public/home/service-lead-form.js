(function () {
  const API = '/api/leads/enquiry';
  const SUCCESS_MESSAGE =
    'Thank you — your request has been sent. Our team will contact you within 1 to 2 hours.';
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[\d\s+().-]{7,20}$/;

  const form = document.querySelector('.service-book-form');
  if (!form) return;

  const card = form.closest('.service-book-card');
  const serviceName = card?.dataset.service || document.title.split('|')[0].trim();
  const propertyType = card?.dataset.propertyType || 'residential';

  const feedback = document.createElement('p');
  feedback.className = 'quote-form__feedback';
  feedback.setAttribute('role', 'status');
  feedback.hidden = true;
  form.insertBefore(feedback, form.firstChild);

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn ? submitBtn.querySelector('.btn-primary__label') : null;
  const defaultSubmitLabel = submitLabel ? submitLabel.textContent.trim() : 'Submit';

  function field(name) {
    return form.querySelector('[name="' + name + '"]');
  }

  function value(name) {
    return field(name)?.value?.trim() || '';
  }

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

  function isFormComplete() {
    return Boolean(value('fullName') && value('email'));
  }

  function validate() {
    if (!value('fullName')) return 'Please enter your full name.';
    if (!EMAIL_REGEX.test(value('email'))) return 'Please enter a valid email address.';
    if (value('phone') && !PHONE_REGEX.test(value('phone'))) return 'Please enter a valid phone number.';
    return null;
  }

  function updateSubmitState() {
    if (!submitBtn) return;
    const busy = form.classList.contains('quote-form--loading');
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

  form.addEventListener('input', function () {
    if (feedback.classList.contains('quote-form__feedback--error')) clearFeedback();
    updateSubmitState();
  });
  form.addEventListener('change', updateSubmitState);
  updateSubmitState();

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearFeedback();

    const error = validate();
    if (error) {
      setFeedback('error', error);
      return;
    }

    setFormBusy(true);

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: value('fullName'),
        email: value('email'),
        phone: value('phone'),
        message: value('message'),
        service: serviceName,
        propertyType: propertyType,
        page: window.location.pathname,
      }),
    })
      .then(function (response) {
        return response
          .json()
          .catch(function () { return {}; })
          .then(function (payload) {
            return { ok: response.ok, payload: payload };
          });
      })
      .then(function (result) {
        if (!result.ok) {
          const message =
            (Array.isArray(result.payload?.data)
              ? result.payload.data.map(function (e) { return e.msg; }).join(', ')
              : null) ||
            result.payload?.message ||
            'Could not send your request. Please try again.';
          throw new Error(message);
        }

        form.reset();
        setFeedback('success', SUCCESS_MESSAGE);
      })
      .catch(function (err) {
        setFeedback('error', err.message || 'Something went wrong. Please try again.');
      })
      .finally(function () {
        setFormBusy(false);
      });
  });
})();
