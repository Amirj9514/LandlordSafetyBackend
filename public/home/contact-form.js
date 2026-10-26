/**
 * Contact page "Send an Enquiry" form: inline validation (shown on submit and on blur, cleared as
 * soon as the value is fixed), then POST /api/leads/enquiry. The server checks the same rules again.
 */
(function () {
  const API = '/api/leads/enquiry';
  const SUCCESS_MESSAGE =
    'Thank you — your request has been sent. Our team will contact you within 1 to 2 hours.';
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Same UK rule as the quote form: 07…, 01/02/03… or +44, spaces allowed.
  const UK_PHONE_REGEX = /^(?:\+44|0)(?:7\d{9}|[123]\d{8,9})$/;
  const SUBJECTS = ['Residential', 'Commercial', 'Quotes & Certification', 'Others'];
  const FIELDS = ['fullName', 'email', 'phone', 'subject', 'message'];
  const ERROR_IDS = {
    fullName: 'enquiry-name-error',
    email: 'enquiry-email-error',
    phone: 'enquiry-phone-error',
    subject: 'enquiry-subject-error',
    message: 'enquiry-message-error',
  };

  const form = document.querySelector('.service-book-form');
  if (!form) return;

  const card = form.closest('.service-book-card');
  const serviceName = card?.dataset.service || 'General Enquiry';

  const feedback = document.createElement('p');
  feedback.className = 'quote-form__feedback';
  feedback.setAttribute('role', 'status');
  feedback.hidden = true;
  form.insertBefore(feedback, form.firstChild);

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn ? submitBtn.querySelector('.btn-primary__label') : null;
  const defaultSubmitLabel = submitLabel ? submitLabel.textContent.trim() : 'Send';

  const field = (name) => form.querySelector('[name="' + name + '"]');
  const value = (name) => (field(name)?.value || '').trim();

  function errorFor(name) {
    const v = value(name);
    switch (name) {
      case 'fullName':
        return v ? '' : 'Please enter your full name';
      case 'email':
        if (!v) return 'Please enter your email address';
        return EMAIL_REGEX.test(v) ? '' : 'Please enter a valid email address';
      case 'phone': {
        if (!v) return '';
        const compact = v.replace(/\s+/g, '').replace(/^\+44\(0\)/, '+44');
        return UK_PHONE_REGEX.test(compact) ? '' : 'Please enter a valid UK phone number';
      }
      case 'subject':
        return SUBJECTS.includes(v) ? '' : 'Please select a subject';
      case 'message':
        return v ? '' : 'Please enter your message';
      default:
        return '';
    }
  }

  function showError(name, message) {
    const input = field(name);
    const el = document.getElementById(ERROR_IDS[name]);
    if (!input || !el) return;
    el.textContent = message || '';
    el.hidden = !message;
    input.classList.toggle('field-input--invalid', Boolean(message));
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  const isShowingError = (name) => {
    const el = document.getElementById(ERROR_IDS[name]);
    return Boolean(el && !el.hidden);
  };

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

  function setFormBusy(isBusy) {
    form.classList.toggle('quote-form--loading', isBusy);
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      el.disabled = isBusy;
    });
    if (submitBtn) {
      submitBtn.disabled = isBusy;
      submitBtn.classList.toggle('is-loading', isBusy);
      submitBtn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    }
    if (submitLabel) submitLabel.textContent = isBusy ? 'Submitting' : defaultSubmitLabel;
  }

  FIELDS.forEach((name) => {
    const input = field(name);
    if (!input) return;
    input.addEventListener('blur', () => showError(name, errorFor(name)));
    const refresh = () => {
      if (isShowingError(name)) showError(name, errorFor(name));
    };
    input.addEventListener('input', refresh);
    input.addEventListener('change', refresh);
  });

  form.addEventListener('input', () => {
    if (feedback.classList.contains('quote-form__feedback--error')) clearFeedback();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFeedback();

    let first = null;
    FIELDS.forEach((name) => {
      const message = errorFor(name);
      showError(name, message);
      if (message && !first) first = field(name);
    });
    if (first) {
      first.focus();
      return;
    }

    setFormBusy(true);

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: value('fullName'),
        email: value('email'),
        phone: value('phone').replace(/\s+/g, ' '),
        subject: value('subject'),
        message: value('message'),
        service: serviceName,
        propertyType: value('subject') === 'Commercial' ? 'commercial' : 'residential',
        page: window.location.pathname,
      }),
    })
      .then((response) =>
        response
          .json()
          .catch(() => ({}))
          .then((payload) => ({ ok: response.ok, payload }))
      )
      .then((result) => {
        if (!result.ok) {
          const message =
            (Array.isArray(result.payload?.data)
              ? result.payload.data.map((e) => e.msg).join(', ')
              : null) ||
            result.payload?.message ||
            'Could not send your request. Please try again.';
          throw new Error(message);
        }
        form.reset();
        FIELDS.forEach((name) => showError(name, ''));
        setFeedback('success', SUCCESS_MESSAGE);
      })
      .catch((err) => {
        setFeedback('error', err.message || 'Something went wrong. Please try again.');
      })
      .finally(() => {
        setFormBusy(false);
      });
  });
})();
