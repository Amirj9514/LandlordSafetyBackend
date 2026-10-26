/**
 * Related Services block for the installation service pages.
 *
 * Each installation page shows exactly two "related" service cards between the pricing section and
 * "What's Included". The content is data-driven: edit RELATED_BY_PAGE below (title, text, price, image
 * and one `link` per card) and run `node scripts/installation-related.js`. The script is idempotent: it
 * replaces the block between the marker comments and removes the old "Explore More Services" section.
 */
const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, '..', 'public', 'home', 'services');

// Placeholder content used until the real sub-services are supplied. `link` is the single field that
// drives the card's image corner link, title link and button.
const PLACEHOLDER_LINK = '/book-now/?propertyType=installation';
const PLACEHOLDERS = [
  {
    title: 'Rewiring Property',
    text: 'Full or partial rewiring to BS7671, with an Electrical Installation Certificate on completion.',
    price: '64.99',
    image: 'EICR.png',
    link: PLACEHOLDER_LINK,
  },
  {
    title: 'Socket Installation',
    text: 'New or additional sockets installed and certified to BS7671.',
    price: '180',
    image: 'CEICR.png',
    link: PLACEHOLDER_LINK,
  },
];

const BUTTON_TEXT = 'Get a Quote';

// Folder name under public/home/services -> exactly two related cards.
const RELATED_BY_PAGE = {
  InstallationBoiler: PLACEHOLDERS,
  'InstallationConsumerUnit(FuseBoard)': PLACEHOLDERS,
  InstallationFireSafetyDiagnostics: PLACEHOLDERS,
  installationElectricalRepairDiagnostics: PLACEHOLDERS,
  'installationGasRepair&Diagnostics': PLACEHOLDERS,
  installationHeatSmokeAlarmPanelInstallation: PLACEHOLDERS,
};

const START = '<!-- related-services:start -->';
const END = '<!-- related-services:end -->';
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function renderCard(card) {
  return `                            <article class="service-card">
                                <div class="service-card__media">
                                    <img src="/servicesImages/${card.image}" alt="" width="480" height="200">
                                    <a href="${esc(card.link)}" class="service-card__corner" aria-label="${BUTTON_TEXT}: ${esc(card.title)}">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                            <path d="M4.667 11.333 11.333 4.667M5.333 4.667h6v6" stroke="currentColor" stroke-width="1.5"
                                                stroke-linecap="round" stroke-linejoin="round" />
                                        </svg>
                                    </a>
                                </div>
                                <div class="service-card__content">
                                    <h3 class="service-card__name"><a href="${esc(card.link)}" class="service-card__link">${esc(card.title)}</a></h3>
                                    <p class="service-card__desc">${esc(card.text)}</p>
                                    <div class="service-card__meta">
                                        <div class="service-card__pricing">
                                            <span class="service-card__from">Starting from</span>
                                            <span class="service-card__price">&pound;${esc(card.price)} <span class="price-novat">No VAT</span></span>
                                        </div>
                                        <a href="${esc(card.link)}" class="service-card__cta">
                                            <span>${BUTTON_TEXT}</span>
                                            <span class="service-card__cta-arrow" aria-hidden="true">
                                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                    <path d="M3.333 8h9.334M8 3.333 12.667 8 8 12.667" stroke="currentColor"
                                                        stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                                </svg>
                                            </span>
                                        </a>
                                    </div>
                                </div>
                            </article>`;
}

function renderBlock(cards) {
  if (cards.length !== 2) throw new Error('Related Services needs exactly 2 cards');
  return `${START}
                    <section class="service-related" aria-labelledby="related-services-title">
                        <header class="service-included__header">
                            <h2 id="related-services-title" class="service-included__title">
                                Related
                                <span class="service-included__title-accent">Services</span>
                            </h2>
                            <p class="service-included__subtitle">Everything you need to keep your property safe, legal and fully compliant under one roof.</p>
                        </header>
                        <div class="services-grid services-grid--compact">
${cards.map(renderCard).join('\n')}
                        </div>
                    </section>
                    ${END}
                    `;
}

/** Returns the page HTML with Related Services above What's Included and "Explore More" removed. */
function applyRelated(html, pageDir) {
  const cards = RELATED_BY_PAGE[pageDir];
  if (!cards) throw new Error('No related config for ' + pageDir);
  const crlf = html.includes('\r\n');
  let s = html.replace(/\r\n/g, '\n');

  // Remove the previous block (re-runs) and any old full-width related / "Explore More" section.
  s = s.replace(new RegExp('[ \\t]*' + START + '[\\s\\S]*?' + END + '\\n?[ \\t]*', 'g'), '');
  s = s.replace(/\n?[ \t]*<section class="services services--related"[\s\S]*?<\/section>[ \t]*\n/, '\n');

  const anchor = s.search(/[ \t]*<section class="service-included/);
  if (anchor < 0) throw new Error('No "What\'s Included" section in ' + pageDir);
  const indentLen = s.slice(anchor).match(/^[ \t]*/)[0].length;
  const at = anchor + indentLen;
  s = s.slice(0, at) + renderBlock(cards) + s.slice(at);
  return crlf ? s.replace(/\n/g, '\r\n') : s;
}

module.exports = { applyRelated, RELATED_BY_PAGE };

if (require.main === module) {
  Object.keys(RELATED_BY_PAGE).forEach((dir) => {
    const file = path.join(servicesDir, dir, 'index.html');
    fs.writeFileSync(file, applyRelated(fs.readFileSync(file, 'utf8'), dir));
    console.log('Updated', dir);
  });
}
