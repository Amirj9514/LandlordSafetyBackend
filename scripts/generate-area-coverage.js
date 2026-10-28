/**
 * Rebuilds the three coverage tabs (Inner London, Outer London, M25 London) of the Area Coverage page from
 * src/constants/areaCoverage.js, so the page and the pricing zones always use the same postcode lists.
 *
 *   node scripts/generate-area-coverage.js
 *
 * Only the markup between <div class="area-finder__panels"> and the "no matching area" message is replaced.
 * Each card's one-line description is kept from the existing page (see COPY_ALIASES for renamed areas), so
 * the script is idempotent and can be run again after any change to the postcode lists.
 */
const fs = require('fs');
const path = require('path');
const { COVERAGE_GROUPS } = require('../src/constants/areaCoverage');

const PAGE = path.join(__dirname, '..', 'public', 'home', 'area-coverage', 'index.html');
const VISIBLE_CODES = 10;

// A card that was renamed in the final zone list takes its description from the old card.
const COPY_ALIASES = {
  'Hertfordshire & Buckinghamshire': 'Hertfordshire',
};

const GROUP_COPY = {
  'inner-london': {
    desc: 'The City of London and the inner boroughs &mdash; the highest-density residential, commercial and mixed-use property in the capital.',
    countLabel: (areas) => `${areas.filter((a) => !a.notBorough).length} Boroughs`,
  },
  'outer-london': {
    desc: 'Greater London&rsquo;s residential heartland &mdash; full coverage across all 20 outer boroughs.',
    countLabel: (areas) => `${areas.length} Boroughs`,
  },
  'm25-areas': {
    desc: 'Coverage beyond Greater London into Hertfordshire, Buckinghamshire, Surrey, Kent and Essex &mdash; the postcodes listed inside the M25.',
    countLabel: () => 'Multiple Areas',
    staticCount: true,
  },
};

const DEFAULT_DESC = {
  'Hertfordshire & Buckinghamshire': 'Commuter towns and new-build apartments north-west of London.',
  Surrey: 'Surrey and the Thames Valley towns within the M25.',
  'Kent & Essex': 'Market towns and commuter belt east and south-east of London.',
};

// Search words (towns) for the M25 cards, on top of the postcodes. Only places that are actually covered.
const TOWNS = {
  'Hertfordshire & Buckinghamshire': 'hertfordshire buckinghamshire watford rickmansworth borehamwood radlett bushey abbots langley',
  Surrey: 'surrey esher walton-on-thames epsom banstead caterham coulsdon warlingham sunbury shepperton ashford thames ditton molesey',
  'Kent & Essex': 'kent essex dartford swanley loughton buckhurst hill chigwell purfleet abridge',
};

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const decode = (s) => s.replace(/&amp;/g, '&');

let html = fs.readFileSync(PAGE, 'utf8');
const crlf = html.includes('\r\n');
html = html.replace(/\r\n/g, '\n');

// ── copy and search words carried over from the current page
const oldCopy = {};
const oldAliases = {};
for (const m of html.matchAll(/<article class="area-card"[^>]*?data-area-search="([^"]*)"[^>]*>([\s\S]*?)<\/article>/g)) {
  const name = decode(m[2].match(/area-card__name">([^<]+)</)[1]);
  const desc = m[2].match(/area-card__desc">([^<]*)</)[1];
  // First card with a given name wins (the page used to hold a hidden Central London tab with a second City card).
  if (!(name in oldCopy)) {
    oldCopy[name] = desc;
    oldAliases[name] = m[1].split(' ').filter((w) => w && !/^[a-z]{1,2}\d/.test(w));
  }
}

const card = (group, area) => {
  const copySource = COPY_ALIASES[area.name] || area.name;
  const desc = oldCopy[copySource] ?? DEFAULT_DESC[area.name] ?? '';
  const codes = area.postcodes;
  const hiddenCount = Math.max(0, codes.length - VISIBLE_CODES);
  const lis = codes
    .map((code, i) => `                                        <li${i >= VISIBLE_CODES ? ' hidden' : ''}>${code}</li>`)
    .join('\n');
  const more = hiddenCount
    ? `\n                                        <li class="area-card__more-item"><button type="button" class="area-card__more">+${hiddenCount} more</button></li>`
    : '';
  const nameWords = area.name.toLowerCase().replace(/&/g, ' ');
  const words = TOWNS[area.name] || [...new Set([nameWords, ...(oldAliases[area.name] || [])])].join(' ');
  const search = `${words.replace(/\s+/g, ' ').trim()} ${codes.map((c) => c.toLowerCase()).join(' ')}`;
  const notBorough = area.notBorough ? ' data-not-borough' : '';
  const name = escapeHtml(area.name);
  return `                            <article class="area-card"${notBorough} data-area-search="${escapeHtml(search)}">
                                <div class="area-card__top">
                                    <h4 class="area-card__name">${name}</h4>
                                    <p class="area-card__desc">${desc}</p>
                                </div>
                                <div class="area-card__mid">
                                    <p class="area-card__label">Postcodes Covered</p>
                                    <ul class="area-card__codes" aria-label="Postcodes covered in ${name}">
${lis}${more}
                                    </ul>
                                </div>
                                <div class="area-card__bottom">
                                    <a href="/book-now/" class="btn-primary btn-primary--header area-card__cta">
                                        <span class="btn-primary__label">Book Now</span>
                                        <span class="btn-primary__arrow" aria-hidden="true">
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                <path d="M3.333 8h9.334M8 3.333 12.667 8 8 12.667" stroke="currentColor"
                                                    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                            </svg>
                                        </span>
                                    </a>
                                </div>
                            </article>`;
};

const panels = COVERAGE_GROUPS.map((group, index) => {
  const copy = GROUP_COPY[group.key];
  const areas = group.areas.map((a) => ({ ...a, notBorough: group.key === 'inner-london' && a.name === 'City of London' }));
  const distinct = new Set(areas.flatMap((a) => a.postcodes)).size;
  return `                    <div class="area-group" id="panel-${group.key}" role="tabpanel" aria-labelledby="tab-${group.key}" data-area-panel="${group.key}"${index === 0 ? '' : ' hidden'}>
                        <header class="area-group__header">
                            <div class="area-group__intro">
                                <h3 class="area-group__name">${group.name}</h3>
                                <p class="area-group__desc">${copy.desc}</p>
                            </div>
                            <div class="area-group__stats">
                                <p class="area-group__count"${copy.staticCount ? ' data-count-static' : ''}>${copy.countLabel(areas)}</p>
                                <p class="area-group__postcodes">${distinct} postcodes</p>
                            </div>
                        </header>
                        <div class="area-group__grid">
${areas.map((a) => card(group, a)).join('\n')}
                        </div>
                    </div>`;
}).join('\n');

const start = html.indexOf('<div class="area-finder__panels">');
const end = html.indexOf('                    <div class="area-empty"');
if (start < 0 || end < 0) throw new Error('Area Coverage page markers not found');
const open = html.indexOf('\n', start) + 1;
html = html.slice(0, open) + panels + '\n\n' + html.slice(end);

// hero line: what is covered
html = html.replace(
  /(<p class="service-hero__lead">)[\s\S]*?(<\/p>)/,
  `$1Gas Safe &amp; NICEIC accredited engineers covering all 32 London boroughs and the City of London, plus
                        the Hertfordshire, Buckinghamshire, Surrey, Kent and Essex postcodes inside the M25. Certificates
                        issued as soon as they&rsquo;re ready &mdash; most within 24&ndash;48 hours.$2`
);

fs.writeFileSync(PAGE, crlf ? html.replace(/\n/g, '\r\n') : html);
const total = COVERAGE_GROUPS.reduce((n, g) => n + g.areas.length, 0);
console.log(`Area Coverage page rebuilt: ${COVERAGE_GROUPS.length} tabs, ${total} area cards.`);
