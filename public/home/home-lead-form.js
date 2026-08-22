(function () {
  const API = '/api/leads';
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

    setFormBusy(true);

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcode: postcode, propertyType: propertyType, contact: contact }),
    })
      .then(function (response) {
        return response.json().then(function (payload) {
          return { ok: response.ok, payload: payload };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          var message =
            result.payload?.message ||
            (Array.isArray(result.payload?.data)
              ? result.payload.data.map(function (e) { return e.msg; }).join(', ')
              : null) ||
            'Could not submit your quote request. Please try again.';
          throw new Error(message);
        }

        var reference = result.payload?.data?.reference;
        setFeedback(
          'success',
          reference
            ? 'Thanks — your quote request (' + reference + ') has been received. We will be in touch shortly.'
            : 'Thanks — your quote request has been received. We will be in touch shortly.'
        );
        form.reset();
        var residential = form.querySelector('input[name="property-type"][value="residential"]');
        if (residential) residential.checked = true;
      })
      .catch(function (error) {
        setFeedback('error', error.message || 'Something went wrong. Please try again.');
      })
      .finally(function () {
        setFormBusy(false);
      });
  });
})();
