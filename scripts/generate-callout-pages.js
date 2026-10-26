/**
 * Non-Emergency Callout pages: /services/non-emergency-callout/ and /services/CommercialNonEmergencyCallout/.
 *
 * The page copy lives in the PAGES data below. Running `node scripts/generate-callout-pages.js` rewrites only the
 * callout-specific parts of each page (title, hero, description, pricing, What's Included, How It Works, Key
 * Information and the enquiry card heading). The related-services block, the FAQ, the CTA, the footer and the
 * commercial "Explore More" section are left exactly as they are. The script is idempotent.
 *
 * (scripts/generate-service-pages.js is an older, simpler generator that cannot reproduce these pages.)
 */
const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, '..', 'public', 'home', 'services');

const PRICE = '119.99';
const NOTE = 'Includes 1 hour of labour. Parts and materials are charged separately.';

const SHARED = {
  description2:
    'Your callout includes one hour of on-site labour. If the fault can be fixed within that hour, the engineer fixes it during the visit. If it needs more time or parts, you’ll get a report and a quote, and nothing extra goes ahead without your approval.',
  pricing: [
    { name: 'Gas Fault Callout', desc: 'Boiler, heating and gas appliance faults' },
    { name: 'Electrical Fault Callout', desc: 'Tripping circuits, power loss, sockets and lighting faults' },
    { name: 'Fire Alarm Fault Callout', desc: 'False alarms, panel faults and detector issues' },
  ],
  included: [
    { title: 'Qualified Engineer', text: 'Matched to the fault type, whether gas, electrical or fire.' },
    { title: '1 Hour On-Site Labour', text: 'To diagnose the fault and fix it where possible.' },
    { title: 'Clear Fault Report', text: 'What was found, what was fixed, and photos where relevant.' },
    { title: 'Quote for Further Work', text: 'Provided before any extra work goes ahead.' },
  ],
  steps: [
    { title: 'Book online', text: 'Choose the fault type and briefly describe the issue.' },
    { title: 'Engineer attends', text: 'They diagnose the fault and fix it within the included hour where possible.' },
    { title: 'Report & quote', text: 'You receive a fault report and, if needed, a quote for any further repairs.' },
  ],
  keyInfo: [
    { title: 'Not for Emergencies', text: 'If you smell gas, call the National Gas Emergency Service on 0800 111 999 immediately. For dangerous electrical faults, switch off the power at the fuse board and keep clear.' },
    { title: 'Payment', text: 'The callout fee is paid upfront and covers one hour of labour. Parts and materials are charged on top.' },
    { title: 'Longer Repairs', text: 'Anything beyond one hour is quoted separately and only carried out with your approval.' },
    { title: 'Availability', text: 'Visits from the next working day, subject to engineer availability.' },
  ],
};

const PAGES = {
  'non-emergency-callout': {
    docTitle: 'Non-Emergency Callout',
    heroLines: ['Non-Emergency', 'Callout'],
    bookHref: '/book-now/?service=callout',
    pricingTitle: ['Pricing For Residential', 'Callouts'],
    description1:
      'A boiler that won’t fire, a circuit that keeps tripping, a fire alarm going off for no reason: problems that need fixing soon but aren’t an emergency. We send a qualified engineer matched to the fault: Gas Safe registered for gas, NICEIC or NAPIT registered for electrical, and fire alarm specialists for alarm faults.',
    dutyItem: { title: 'Landlord’s Duty of Care', text: 'Fixing reported faults promptly is part of a landlord’s duty to keep the property safe for tenants.' },
    enquiry: { title: 'Enquire About a Non-Emergency Callout', service: 'Non-Emergency Callout', aria: 'Enquire about a Non-Emergency Callout' },
    keepSample: true,
    related: ['/services/cp12/', '/services/eicr/', '/services/fsc/'],
  },
  CommercialNonEmergencyCallout: {
    docTitle: 'Commercial Non-Emergency Callout',
    heroLines: ['Commercial Non-Emergency', 'Callout'],
    bookHref: '/book-now/?propertyType=commercial&service=callout',
    pricingTitle: ['Pricing For Commercial', 'Callouts'],
    description1:
      'A heating fault, a tripping circuit or a fire alarm fault in your premises: problems that need fixing soon to avoid disruption to your business, staff or tenants. We send a qualified engineer matched to the fault: Gas Safe registered for gas, NICEIC or NAPIT registered for electrical, and fire alarm specialists for alarm faults.',
    dutyItem: { title: 'Duty of Care', text: 'Fixing faults promptly helps you meet your duty to keep premises safe for staff and visitors.' },
    enquiry: { title: 'Enquire About a Commercial Callout', service: 'Commercial Non-Emergency Callout', aria: 'Enquire about a Commercial Callout' },
    keepSample: false,
    related: ['/services/CommercialCP42/', '/services/CommercialCEICR/', '/services/CommercialFSC/'],
  },
};

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const arrow = (w) => `<svg width="${w}" height="${w}" viewBox="0 0 16 16" fill="none">
                                <path d="M3.333 8h9.334M8 3.333 12.667 8 8 12.667" stroke="currentColor"
                                    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>`;

function hero(p) {
  return `<section class="service-hero" aria-labelledby="service-hero-title">
            <div class="service-hero__media" aria-hidden="true"></div>
            <div class="service-hero__overlay" aria-hidden="true"></div>
            <div class="service-hero__inner">
                <div class="service-hero__content">
                    <h1 id="service-hero-title" class="service-hero__title">
                        ${esc(p.heroLines[0])}
                        <span class="service-hero__title-accent">${esc(p.heroLines[1])}</span>
                    </h1>
                    <p class="service-hero__lead">Fault finding for gas, electrical or fire related issues. A qualified engineer attends, finds the fault and fixes it on the spot where possible.</p>
                    <div class="service-hero__actions">
                        <div class="service-hero__price-pill">
                            <span>Starting from</span>
                            ${arrow(16)}
                            <strong>&pound;${PRICE} <span class="price-novat">No VAT</span></strong>
                        </div>
                        <a href="${p.bookHref}" class="btn-primary btn-primary--header service-hero__book-btn">
                            <span class="btn-primary__label">Book Now</span>
                            <span class="btn-primary__arrow" aria-hidden="true">
                                ${arrow(14)}
                            </span>
                        </a>
                    </div>
                </div>
            </div>
        </section>`;
}

function detail(p) {
  return `<div class="service-detail" aria-labelledby="service-detail-title">
                        <h2 id="service-detail-title" class="service-detail__title">
                            ${esc(p.heroLines[0].replace(/^Commercial /, ''))}
                            <span class="service-detail__title-accent">Callout</span>
                        </h2>
                        <div class="service-detail__copy">
                            <p>${esc(p.description1)}</p>
                            <p>${esc(SHARED.description2)}</p>
                        </div>
                    </div>`;
}

function pricing(p) {
  const cards = SHARED.pricing.map((c) => `                            <article class="service-pricing-card">
                                <div class="service-pricing-card__top">
                                    <h3 class="service-pricing-card__name">${esc(c.name)}</h3>
                                    <p class="service-pricing-card__desc">${esc(c.desc)}</p>
                                </div>
                                <hr class="service-pricing-card__divider">
                                <div class="service-pricing-card__bottom">
                                    <div class="service-pricing-card__pricing">
                                        <span class="service-pricing-card__from">Starting from</span>
                                        <span class="service-pricing-card__price">&pound;${PRICE} <span class="price-novat">No VAT</span></span>
                                    </div>
                                    <a href="${p.bookHref}"
                                        class="btn-primary btn-primary--header service-pricing-card__cta">
                                        <span class="btn-primary__label">Book Now</span>
                                        <span class="btn-primary__arrow" aria-hidden="true">
                                            ${arrow(14)}
                                        </span>
                                    </a>
                                </div>
                            </article>`).join('\n\n');
  return `<section class="service-pricing service-pricing--aligned" aria-labelledby="service-pricing-title">
                        <header class="service-pricing__header">
                            <h2 id="service-pricing-title" class="service-pricing__title">
                                ${esc(p.pricingTitle[0])}
                                <span class="service-pricing__title-accent">${esc(p.pricingTitle[1])}</span>
                            </h2>
                        </header>

                        <div class="service-pricing__grid">
${cards}
                            <p class="service-pricing__extras">${esc(NOTE)}</p>
                        </div>
                    </section>`;
}

function included() {
  const card = (c) => `                                <article class="service-included-card">
                                    <h3 class="service-included-card__title">${esc(c.title)}</h3>
                                    <p class="service-included-card__text">${esc(c.text)}</p>
                                </article>`;
  const [a, b, c, d] = SHARED.included;
  return `<section class="service-included" aria-labelledby="service-included-title">
                        <header class="service-included__header">
                            <h2 id="service-included-title" class="service-included__title">
                                What&rsquo;s
                                <span class="service-included__title-accent">Included</span>
                            </h2>
                        </header>

                        <div class="service-included__grid">
                            <div class="service-included__col">
${card(a)}
${card(b)}
                            </div>
                            <div class="service-included__col">
${card(c)}
${card(d)}
                            </div>
                        </div>
                    </section>`;
}

function numbered(id, title, accent, items) {
  const li = items.map((it, i) => `                            <li class="service-requirements-item">
                                <span class="service-requirements-item__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
                                <div class="service-requirements-item__body">
                                    <h3 class="service-requirements-item__title">${esc(it.title)}</h3>
                                    <p class="service-requirements-item__text">${esc(it.text)}</p>
                                </div>
                            </li>`).join('\n');
  return `<section class="service-requirements" aria-labelledby="${id}-title">
                        <header class="service-requirements__header">
                            <h2 id="${id}-title" class="service-requirements__title">
                                ${title}
                                <span class="service-requirements__title-accent">${accent}</span>
                            </h2>
                        </header>

                        <ol class="service-requirements__list">
${li}
                        </ol>
                    </section>`;
}

// "Explore More Services": the three cards are copied from the All Services page (services/index.html), so
// titles, descriptions, prices and "No VAT" always match the linked service. Same markup as the other service pages.
function relatedSection(hrefs) {
  const hub = fs.readFileSync(path.join(servicesDir, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
  const articles = hub.match(/<article class="service-card[^"]*">[\s\S]*?<\/article>/g) || [];
  const cards = hrefs.map((href) => {
    const found = articles.find((a) => a.includes(`<a href="${href}" class="service-card__link"`));
    if (!found) throw new Error('No All Services card for ' + href);
    return found.replace(/^/gm, '        ').replace(/^ {8}(?=<article)/, '                    ');
  });
  return `<section class="services services--related" aria-labelledby="related-services-title">
            <div class="services__inner">
                <div class="services__header">
                    <div class="services__intro">
                        <h2 id="related-services-title" class="services__title">
                            Explore More
                            <span class="services__title-accent">Services</span>
                        </h2>
                        <p class="services__lead">View our full range of landlord compliance certificates and
                            inspections.</p>
                    </div>
                </div>
                <div class="services-grid services-grid--compact">
${cards.join('\n')}
                </div>
            </div>
        </section>`;
}

function build(html, dir) {
  const p = PAGES[dir];
  const crlf = html.includes('\r\n');
  let s = html.replace(/\r\n/g, '\n');
  const must = (cond, msg) => { if (!cond) throw new Error(dir + ': ' + msg); };

  // <title>
  s = s.replace(/<title>[^<]*<\/title>/, `<title>${esc(p.docTitle)} | Landlord Safety Inspection Limited</title>`);

  // Hero
  const heroStart = s.indexOf('<section class="service-hero"');
  must(heroStart >= 0, 'hero not found');
  const heroEnd = s.indexOf('</section>', heroStart) + '</section>'.length;
  s = s.slice(0, heroStart) + hero(p) + s.slice(heroEnd);

  // Everything from the description down to the sample report / end of the main column.
  const bodyStart = s.indexOf('<div class="service-detail"');
  must(bodyStart >= 0, 'service-detail not found');
  const sampleAt = s.indexOf('<section class="service-sample"');
  let bodyEnd;
  if (p.keepSample && sampleAt > bodyStart) {
    bodyEnd = sampleAt;
  } else {
    const closeMain = s.indexOf('</div>\n\n                <aside class="service-book-card"', bodyStart);
    must(closeMain >= 0, 'end of main column not found');
    bodyEnd = closeMain;
  }
  const sections = [
    detail(p),
    pricing(p),
    included(),
    numbered('how-it-works', 'How It', 'Works', SHARED.steps),
    numbered('service-requirements', 'Key', 'Information', [...SHARED.keyInfo, p.dutyItem]),
  ].join('\n\n                    ');
  const tail = p.keepSample ? '\n\n                    ' : '\n                ';
  s = s.slice(0, bodyStart) + sections + tail + s.slice(bodyEnd).replace(/^\s+(?=<)/, '');

  // Explore More Services: replace any existing block and place it between the layout and the FAQ.
  s = s.replace(/[ \t]*<section class="services services--related"[\s\S]*?<\/section>[ \t]*\n+/, '');
  const faqAt = s.indexOf('<section id="faq"');
  must(faqAt >= 0, 'faq section not found');
  const faqLine = s.lastIndexOf('\n', faqAt) + 1;
  s = s.slice(0, faqLine) + '        ' + relatedSection(p.related) + '\n\n' + s.slice(faqLine);

  // Enquiry card heading
  s = s.replace(/<aside class="service-book-card"[^>]*>/, (m) => {
    const prop = (m.match(/data-property-type="([^"]*)"/) || [, ''])[1];
    return `<aside class="service-book-card" id="book-callout" aria-label="${esc(p.enquiry.aria)}"\n                    data-service="${esc(p.enquiry.service)}" data-property-type="${prop}">`;
  });
  s = s.replace(/(<h3 class="service-book-card__title">)[^<]*(<\/h3>)/, `$1${esc(p.enquiry.title)}$2`);

  return crlf ? s.replace(/\n/g, '\r\n') : s;
}

module.exports = { PAGES, build };

if (require.main === module) {
  Object.keys(PAGES).forEach((dir) => {
    const file = path.join(servicesDir, dir, 'index.html');
    fs.writeFileSync(file, build(fs.readFileSync(file, 'utf8'), dir));
    console.log('Updated', dir);
  });
}
