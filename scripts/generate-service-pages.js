const fs = require('fs');
const path = require('path');

const homeDir = path.join(__dirname, '../public/home');
const servicesDir = path.join(homeDir, 'services');

const ctaArrow = `<span class="service-card__cta-arrow" aria-hidden="true">
                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                            <path d="M3.333 8h9.334M8 3.333 12.667 8 8 12.667" stroke="currentColor"
                                                stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                        </svg>
                                    </span>`;

function serviceCard({ img, name, desc, price, priceLabel = 'Starting from', href, cta = 'Book Now', quote = false }) {
  const priceHtml = quote
    ? `<span class="service-card__from">Get A Quote</span>
                                    <span class="service-card__price service-card__price--quote">&pound;</span>`
    : `<span class="service-card__from">${priceLabel}</span>
                                    <span class="service-card__price">&pound;${price}</span>`;

  return `                    <article class="service-card">
                        <div class="service-card__media">
                            <img src="${img}" alt="" width="480" height="200">
                        </div>
                        <div class="service-card__content">
                            <h3 class="service-card__name">${name}</h3>
                            <p class="service-card__desc">${desc}</p>
                            <div class="service-card__meta">
                                <div class="service-card__pricing">
                                    ${priceHtml}
                                </div>
                                <a href="${href}" class="service-card__cta">
                                    <span>${cta}</span>
                                    ${ctaArrow}
                                </a>
                            </div>
                        </div>
                    </article>`;
}

const residentialServices = [
  { img: '/pictures/CP12.png', name: 'Gas Safety Certificate (CP12)', desc: 'Annual Gas Safety inspection Required By Law For All Rental Properties.', price: '47.99', href: '/services/cp12/' },
  { img: '/pictures/EICR.png', name: 'Electrical Certificate (EICR)', desc: 'BS7671 Periodic In-depth Electrical Inspection for All Rental properties.', price: '180', href: '/services/eicr/' },
  { img: '/pictures/EPC.png', name: 'Energy Performance Certificate (EPC)', desc: 'Minimum E Rating Required For All Rental Properties.', price: '60', href: '/services/epc/' },
  { img: '/pictures/FSC.png', name: 'Fire Alarm Certificate (FSC)', desc: 'Fire Alarm Testing and Certification to BS 5839.', price: '84.99', href: '/services/fsc/' },
  { img: '/pictures/FRA.png', name: 'Fire Safety Risk Assessment (FRA)', desc: 'Mandatory Fire Risk Assessments for HMOs and Multi-Occupancy Properties.', price: '175.95', href: '/services/fra/' },
  { img: '/images/service-fire-alarm.png', name: 'Emergency Light Certificate (ELC)', desc: 'Testing and Certification of emergency lighting systems to BS 5266.', price: '84.99', href: '/services/elc/' },
  { img: '/images/service-eicr.png', name: 'Portable Appliance (PAT)', desc: 'Mandatory for landlord-provided appliances in HMO and for other commercial lettings.', price: '85', href: '/services/pat/' },
  { img: '/images/service-gas.png', name: 'Boiler Service (Servicing)', desc: 'Annual boiler maintenance and cleaning, carried out by Gas Safe registered engineers.', price: '80', href: '/services/boiler-service/' },
  { img: '/images/service-fra.png', name: 'Asbestos (Survey)', desc: 'Asbestos surveys for older residential properties, required before renovation or demolition work.', price: '180', href: '/services/asbestos/' },
  { img: '/images/service-epc.png', name: 'Floor Plan', desc: 'Professional floor plans for listings, compliance records, or renovations.', price: '60', href: '/services/floor-plan/' },
  { img: '/images/service-gas.png', name: 'Installation / Diagnostic Works', desc: 'Boiler, heating and plumbing installation, plus fault finding on installations, gas and fire systems.', href: '/services/installation/', quote: true },
];

const commercialServices = [
  { img: '/images/service-gas.png', name: 'Commercial Gas Safety Certificate (CP42)', desc: 'CP15, CP17, CP42 and CP16 gas safety inspections for boilers and kitchen appliances.', price: '150', href: '/book-now/?propertyType=commercial&service=cgsc', cta: 'Get a Quote' },
  { img: '/images/service-eicr.png', name: 'Commercial Electrical Certificate (CEICR)', desc: 'Mandatory periodic electrical inspection for commercial premises, certified to BS7671.', price: '199.99', href: '/book-now/?propertyType=commercial&service=com_eicr', cta: 'Get a Quote' },
  { img: '/images/service-epc.png', name: 'Commercial Energy Performance Certificate (CEPC)', desc: 'Required for commercial buildings being sold, let, or constructed.', price: '219.99', href: '/book-now/?propertyType=commercial&service=cepc', cta: 'Get a Quote' },
  { img: '/images/service-fire-alarm.png', name: 'Commercial Fire Alarm Certificate (CFSC)', desc: 'Fire alarm testing and certification to BS 5839 for commercial premises.', price: '129.99', href: '/book-now/?propertyType=commercial&service=cfsc', cta: 'Get a Quote' },
  { img: '/images/service-fra.png', name: 'Commercial Fire Safety Risk Assessment (CFRA)', desc: 'Mandatory fire risk assessments for commercial and multi-occupancy premises.', price: '180', href: '/book-now/?propertyType=commercial&service=com_fra', cta: 'Get a Quote' },
  { img: '/images/service-fire-alarm.png', name: 'Commercial Emergency Lighting Certificate (ELC)', desc: 'Testing and certification of emergency lighting systems to BS 5266.', price: '119.99', href: '/book-now/?propertyType=commercial&service=celc', cta: 'Get a Quote' },
  { img: '/images/service-eicr.png', name: 'Portable Appliance Testing (PAT)', desc: 'Regular PAT testing for all portable electrical equipment on commercial premises.', price: '180', href: '/services/pat/', cta: 'Book Now' },
];

const installationServices = [
  { img: '/images/service-eicr.png', name: 'Consumer Unit Installation (Fuse Board)', desc: 'Upgrade or replace consumer units to meet current BS7671 standards.', href: '/services/installation/', quote: true },
  { img: '/images/service-gas.png', name: 'New Boiler Installation', desc: 'Gas Safe registered boiler installation for residential and commercial properties.', href: '/book-now/?propertyType=installation&service=inst_new_boiler', quote: true, cta: 'Get a Quote' },
  { img: '/images/service-fire-alarm.png', name: 'Fire Alarm &amp; Panel Installation', desc: 'Grade A and Grade D fire alarm system design and installation to BS 5839.', href: '/services/installation/', quote: true, cta: 'Get a Quote' },
  { img: '/images/service-fire-alarm.png', name: 'Emergency Lighting Installation', desc: 'Emergency lighting installation and commissioning to BS 5266.', href: '/book-now/?propertyType=installation&service=inst_emergency_light', quote: true, cta: 'Get a Quote' },
  { img: '/images/service-fire-alarm.png', name: 'Smoke &amp; CO Alarm Installation', desc: 'Interlinked smoke and carbon monoxide alarm installation for rental compliance.', href: '/services/installation/', quote: true, cta: 'Get a Quote' },
];

const servicesTabs = `
                    <div class="services-tabs" role="tablist" aria-label="Property type">
                        <div class="services-tabs__item" data-services-tab-hover="residential">
                            <button type="button" class="services-tabs__btn services-tabs__btn--active" role="tab"
                                aria-selected="true" data-services-tab="residential"
                                aria-controls="services-panel-residential">
                                <svg class="services-tabs__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                                Residential
                            </button>
                        </div>
                        <div class="services-tabs__item" data-services-tab-hover="commercial">
                            <button type="button" class="services-tabs__btn" role="tab" aria-selected="false"
                                data-services-tab="commercial" aria-controls="services-panel-commercial">
                                <svg class="services-tabs__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M4 21V4h10v17M14 8h6v13M8 8h2M8 12h2M8 16h2M17 12h1M17 16h1" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                                Commercial
                            </button>
                        </div>
                        <div class="services-tabs__item" data-services-tab-hover="installation">
                            <button type="button" class="services-tabs__btn" role="tab" aria-selected="false"
                                data-services-tab="installation" aria-controls="services-panel-installation">
                                <svg class="services-tabs__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M14.7 6.3a4.1 4.1 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4.1 4.1 0 0 0 5.4-5.4l-2.1 2.1-2.9-2.9 2.1-2.1Z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                                Installation
                            </button>
                        </div>
                    </div>`;

function servicesSection(panels) {
  return `        <section id="services" class="services services--hub" aria-labelledby="services-title">
            <div class="services__inner">
                <div class="services__header">
                    <div class="services__intro">
                        <h2 id="services-title" class="services__title">
                            Complete Compliance
                            <span class="services__title-accent">Solutions</span>
                        </h2>
                        <p class="services__lead">Everything you need to keep your property safe, legal, and fully
                            compliant under one roof.</p>
                    </div>
${servicesTabs}
                </div>
${panels}
            </div>
        </section>`;
}

function buildPanel(id, key, services, active) {
  const cards = services.map(serviceCard).join('\n\n');
  return `                <div id="${id}" class="services-grid${active ? ' services-grid--active' : ''}" data-services-panel="${key}"${active ? '' : ' hidden'}>
${cards}
                </div>`;
}

const servicesIndexHtml = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>All Compliance Services | Landlord Safety Inspection Limited</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Manrope:wght@200..800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/style.css">
</head>

<body class="services-hub-page">
    <!--#include header-->

    <main>
        <section class="hero hero--services" aria-labelledby="services-hero-title">
            <div class="hero__main">
                <div class="hero__media" aria-hidden="true"></div>
                <div class="hero__overlay" aria-hidden="true"></div>
                <div class="hero__inner layout-shell">
                    <div class="hero__content">
                        <h1 id="services-hero-title" class="hero__title">
                            Every Compliance
                            <span class="hero__title-accent">Certificate you Need.</span>
                        </h1>
                        <p class="hero__lead">Gas, electrical, fire, and energy certificates for landlords across all 32 London boroughs and within M25 London &mdash; issued as soon as they&rsquo;re ready by Gas Safe registered and NICEIC affiliated engineers.</p>
                        <div class="hero__actions">
                            <a href="tel:+447350538874" class="btn-phone btn-phone--hero">
                                <span class="btn-phone__icon" aria-hidden="true">
                                    <img src="/icons/message.svg" alt="" width="14" height="14">
                                </span>
                                <span>07350 538874</span>
                            </a>
                            <a href="/book-now/" class="btn-primary btn-primary--header">
                                <span class="btn-primary__label">Book Now</span>
                                <span class="btn-primary__arrow" aria-hidden="true">
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                        <path d="M3.333 8h9.334M8 3.333 12.667 8 8 12.667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                </span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>

${servicesSection([
  buildPanel('services-panel-residential', 'residential', residentialServices, true),
  buildPanel('services-panel-commercial', 'commercial', commercialServices, false),
  buildPanel('services-panel-installation', 'installation', installationServices, false),
].join('\n\n'))}
    </main>

    <!--#include footer-->

    <script src="/header-mega-menu.js"></script>
    <script>
        (function () {
            var tabs = document.querySelector('.services-tabs');
            if (!tabs) return;
            tabs.addEventListener('click', function (event) {
                var btn = event.target.closest('.services-tabs__btn');
                if (!btn) return;
                var tabKey = btn.getAttribute('data-services-tab');
                if (!tabKey) return;
                tabs.querySelectorAll('.services-tabs__btn').forEach(function (tab) {
                    tab.classList.remove('services-tabs__btn--active');
                    tab.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('services-tabs__btn--active');
                btn.setAttribute('aria-selected', 'true');
                document.querySelectorAll('[data-services-panel]').forEach(function (panel) {
                    var isActive = panel.getAttribute('data-services-panel') === tabKey;
                    panel.hidden = !isActive;
                    panel.classList.toggle('services-grid--active', isActive);
                });
            });
        })();
    </script>
</body>

</html>`;

fs.writeFileSync(path.join(servicesDir, 'index.html'), servicesIndexHtml);

const newServicePages = [
  {
    slug: 'fra',
    cssClass: 'fra',
    title: 'Fire Safety Risk Assessment (FRA)',
    heroLines: ['Fire Safety Risk', 'Assessment (FRA)'],
    price: '175.95',
    lead: 'Mandatory fire risk assessments for HMOs and multi-occupancy properties — identifying hazards and keeping your property compliant.',
    paragraphs: [
      'A Fire Safety Risk Assessment (FRA) is a systematic review of your property to identify fire hazards, evaluate risks, and determine whether existing fire precautions are adequate. For HMOs and many multi-occupancy buildings, a suitable and sufficient FRA is a legal requirement under the Regulatory Reform (Fire Safety) Order 2005.',
      'Landlords and responsible persons must review the assessment regularly and update it whenever there are significant changes to the building, occupancy, or fire safety measures. Local councils often require a copy as part of HMO licensing.',
      'Our qualified assessors cover all 32 London boroughs and the M25 corridor. Reports are delivered promptly with clear action points so you know exactly what needs to be done.',
    ],
    serviceId: 'fra',
    bookTitle: 'Book FRA assessor',
  },
  {
    slug: 'elc',
    cssClass: 'elc',
    title: 'Emergency Light Certificate (ELC)',
    heroLines: ['Emergency Light', 'Certificate (ELC)'],
    price: '84.99',
    lead: 'Testing and certification of emergency lighting systems to BS 5266 — keeping escape routes safe and compliant.',
    paragraphs: [
      'Emergency lighting provides illumination when the mains power fails, guiding occupants safely to exits. BS 5266 requires that emergency lighting systems are regularly tested, maintained, and kept in good working order.',
      'Landlords of HMOs and commercial premises must ensure emergency lighting is functional and documented. A certificate confirms your system has been inspected by a competent person and meets the relevant standard.',
      'We test luminaires, battery duration, charging indicators, and log books. Certificates are issued after inspection, typically within 24 hours.',
    ],
    serviceId: 'elc',
    bookTitle: 'Book ELC inspection',
  },
  {
    slug: 'pat',
    cssClass: 'pat',
    title: 'Portable Appliance Testing (PAT)',
    heroLines: ['Portable Appliance', 'Testing (PAT)'],
    price: '85',
    lead: 'PAT testing for landlord-provided appliances in furnished lettings, HMOs, and commercial premises.',
    paragraphs: [
      'Portable Appliance Testing (PAT) checks the safety of electrical appliances you provide as a landlord — kettles, microwaves, washing machines, and other plug-in equipment. While not always a standalone legal requirement for every rental, PAT is strongly recommended and often required for HMO licensing and commercial lettings.',
      'Testing includes visual inspection and electrical checks to confirm appliances are safe for tenant use. A register and certificate provide evidence of compliance for councils, insurers, and letting agents.',
      'Our engineers cover London and the M25. Pricing starts from £85 depending on the number of appliances.',
    ],
    serviceId: 'pat',
    bookTitle: 'Book PAT testing',
  },
  {
    slug: 'boiler-service',
    cssClass: 'boiler-service',
    title: 'Boiler Service (Servicing)',
    heroLines: ['Boiler Service', '(Servicing)'],
    price: '80',
    lead: 'Annual boiler maintenance and cleaning by Gas Safe registered engineers — keeping heating systems efficient and safe.',
    paragraphs: [
      'An annual boiler service helps maintain efficiency, reduce breakdown risk, and keep your heating system safe. Manufacturers typically require yearly servicing to keep warranties valid.',
      'Our Gas Safe registered engineers inspect, clean, and test your boiler and related flue system. Any safety concerns are reported immediately with clear recommendations.',
      'Boiler servicing starts from £80 across London and the M25. Book online or contact us for properties with multiple appliances.',
    ],
    serviceId: 'boiler',
    bookTitle: 'Book boiler service',
  },
  {
    slug: 'asbestos',
    cssClass: 'asbestos',
    title: 'Asbestos Survey',
    heroLines: ['Asbestos', 'Survey'],
    price: '180',
    lead: 'Asbestos surveys for older residential properties — required before renovation or demolition work.',
    paragraphs: [
      'Properties built before 2000 may contain asbestos-containing materials (ACMs). Before refurbishment, demolition, or certain maintenance work, a suitable asbestos survey is required under the Control of Asbestos Regulations 2012.',
      'We arrange management and refurbishment/demolition surveys carried out by qualified surveyors. Reports identify ACM locations, condition, and recommended actions.',
      'Surveys start from £180 depending on property size and survey type. Contact us with your postcode for a confirmed quote.',
    ],
    serviceId: 'asbestos',
    bookTitle: 'Book asbestos survey',
  },
  {
    slug: 'floor-plan',
    cssClass: 'floor-plan',
    title: 'Floor Plan',
    heroLines: ['Professional', 'Floor Plan'],
    price: '60',
    lead: 'Professional floor plans for property listings, compliance records, and EPC assessments.',
    paragraphs: [
      'Accurate floor plans help market your property, support EPC assessments, and provide clear documentation for tenants and compliance records.',
      'Our surveyors produce scaled plans showing room layouts and key dimensions suitable for listings and regulatory use.',
      'Floor plans start from £60 for standard residential properties across London and the M25.',
    ],
    serviceId: 'floorplan',
    bookTitle: 'Book floor plan',
  },
  {
    slug: 'installation',
    cssClass: 'installation',
    title: 'Installation / Diagnostic Works',
    heroLines: ['Installation /', 'Diagnostic Works'],
    price: null,
    lead: 'Boiler, heating and plumbing installation, plus fault finding on gas, electrical, and fire systems.',
    paragraphs: [
      'From consumer unit upgrades and boiler replacements to fire alarm panel installation and emergency lighting, our accredited engineers handle installation and remedial works across residential and commercial properties.',
      'We also provide diagnostic visits to identify faults across gas, electrical, and fire systems — ideal when an inspection has flagged issues that need expert investigation.',
      'Every job is quoted individually based on scope, access, and materials. Contact us with your requirements for a same-day estimate.',
    ],
    serviceId: 'installation',
    bookTitle: 'Request a quote',
    quote: true,
  },
];

function buildServicePage(service) {
  const bookId = `book-${service.slug.replace(/-/g, '')}`;
  const priceBlock = service.quote
    ? ''
    : `                        <div class="service-hero__price-pill">
                            <span>Starting from</span>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d="M3.333 8h9.334M8 3.333 12.667 8 8 12.667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                            <strong>&pound;${service.price}</strong>
                        </div>`;

  const detailParagraphs = service.paragraphs.map((p) => `                            <p>${p}</p>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${service.title} | Landlord Safety Inspection Limited</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Manrope:wght@200..800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/style.css">
</head>

<body class="service-page service-page--${service.cssClass}">
    <!--#include header-->

    <main>
        <section class="service-hero" aria-labelledby="service-hero-title">
            <div class="service-hero__media" aria-hidden="true"></div>
            <div class="service-hero__overlay" aria-hidden="true"></div>
            <div class="service-hero__inner">
                <div class="service-hero__content">
                    <h1 id="service-hero-title" class="service-hero__title">
                        ${service.heroLines[0]}
                        <span class="service-hero__title-accent">${service.heroLines[1]}</span>
                    </h1>
                    <p class="service-hero__lead">${service.lead}</p>
                    <div class="service-hero__actions">
${priceBlock}
                        <a href="#${bookId}" class="btn-primary btn-primary--header service-hero__book-btn">
                            <span class="btn-primary__label">${service.quote ? 'Get a Quote' : 'Book Now'}</span>
                            <span class="btn-primary__arrow" aria-hidden="true">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                    <path d="M3.333 8h9.334M8 3.333 12.667 8 8 12.667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                            </span>
                        </a>
                    </div>
                </div>
            </div>
        </section>

        <section class="service-layout">
            <div class="service-layout__inner">
                <div class="service-layout__main">
                    <div class="service-detail" aria-labelledby="service-detail-title">
                        <h2 id="service-detail-title" class="service-detail__title">
                            ${service.heroLines[0]}
                            <span class="service-detail__title-accent">${service.heroLines[1]}</span>
                        </h2>
                        <div class="service-detail__copy">
${detailParagraphs}
                        </div>
                    </div>
                </div>

                <aside class="service-book-card" id="${bookId}" aria-label="${service.bookTitle}">
                    <div class="service-book-card__header">
                        <h3 class="service-book-card__title">${service.bookTitle} now!</h3>
                        <p class="service-book-card__subtitle">Quick booking &mdash; pay by invoice after confirmation.</p>
                    </div>

                    <form class="service-book-form quote-form" action="#" method="post" novalidate data-service="${service.serviceId}">
                        <input type="hidden" name="property-type" value="residential">
                        <div class="quote-form__field">
                            <label class="field-label" for="postcode">Postcode</label>
                            <input class="field-input" type="text" id="postcode" name="postcode" placeholder="SW1A 1AA" autocomplete="postal-code" required>
                        </div>
                        <div class="quote-form__field">
                            <label class="field-label" for="contact">Email or Phone</label>
                            <input class="field-input" type="text" id="contact" name="contact" placeholder="you@example.com or 07700 000000" autocomplete="email" required>
                        </div>
                        <button type="submit" class="btn-primary btn-primary--block service-book-card__submit" disabled>
                            <span class="btn-primary__spinner" aria-hidden="true"></span>
                            <span class="btn-primary__label">${service.quote ? 'Get a Quote' : 'Book Now'}</span>
                            <img src="/icons/arrow-right.svg" alt="" class="btn-primary__icon" width="16" height="16">
                        </button>
                    </form>

                    <p class="service-book-card__whatsapp">
                        Prefer to call? <a href="https://wa.me/447350538874" target="_blank" rel="noopener noreferrer">WhatsApp 07350 538874</a>
                    </p>
                </aside>
            </div>
        </section>

        <section class="services services--related" aria-labelledby="related-services-title">
            <div class="services__inner">
                <div class="services__header">
                    <div class="services__intro">
                        <h2 id="related-services-title" class="services__title">
                            Explore More
                            <span class="services__title-accent">Services</span>
                        </h2>
                        <p class="services__lead">View our full range of landlord compliance certificates and inspections.</p>
                    </div>
                    <a href="/services/" class="btn-primary btn-primary--header">All Services</a>
                </div>
                <div class="services-grid services-grid--compact">
${residentialServices.slice(0, 3).map((s) => serviceCard({ ...s, img: s.img.replace(/^\//, '../../') })).join('\n\n')}
                </div>
            </div>
        </section>
    </main>

    <!--#include footer-->

    <script src="/header-mega-menu.js"></script>
    <script src="/service-lead-form.js"></script>
</body>

</html>`;
}

newServicePages.forEach((service) => {
  const dir = path.join(servicesDir, service.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), buildServicePage(service));
});

console.log('Generated services/index.html and', newServicePages.length, 'service pages.');
