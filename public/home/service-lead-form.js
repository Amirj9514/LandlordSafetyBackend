(function () {
  const API = '/api/leads';
  const form = document.querySelector('.service-book-form');
  if (!form) return;

  const feedback = document.createElement('p');
  feedback.className = 'quote-form__feedback';
  feedback.setAttribute('role', 'status');
  feedback.hidden = true;
  form.insertBefore(feedback, form.firstChild);

  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn ? submitBtn.querySelector('.btn-primary__label') : null;
  const defaultSubmitLabel = submitLabel ? submitLabel.textContent.trim() : 'Book Now';
  const serviceName = form.dataset.service || 'service';

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
    const postcode = form.querySelector('#postcode')?.value?.trim() || '';
    const contact = form.querySelector('#contact')?.value?.trim() || '';
    return Boolean(postcode && contact);
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

  form.addEventListener('input', updateSubmitState);
  form.addEventListener('change', updateSubmitState);
  updateSubmitState();

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearFeedback();

    const postcode = form.querySelector('#postcode')?.value?.trim() || '';
    const contact = form.querySelector('#contact')?.value?.trim() || '';
    const propertyType = form.querySelector('[name="property-type"]')?.value || 'residential';

    if (!postcode || !contact) {
      setFeedback('error', 'Please fill in postcode and email or phone.');
      return;
    }

    setFormBusy(true);

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postcode: postcode,
        propertyType: propertyType,
        contact: contact,
      }),
    })
      .then(function (response) {
        return response.json().then(function (payload) {
          return { ok: response.ok, payload: payload };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          const message =
            result.payload?.message ||
            (Array.isArray(result.payload?.data)
              ? result.payload.data.map(function (e) { return e.msg; }).join(', ')
              : null) ||
            'Could not submit your booking request. Please try again.';
          throw new Error(message);
        }

        const reference = result.payload?.data?.reference;
        setFeedback(
          'success',
          reference
            ? 'Thanks — your booking request (' + reference + ') has been received. We will be in touch shortly.'
            : 'Thanks — your booking request has been received. We will be in touch shortly.'
        );
        form.reset();
      })
      .catch(function (error) {
        setFeedback('error', error.message || 'Something went wrong. Please try again.');
      })
      .finally(function () {
        setFormBusy(false);
      });
  });
})();
