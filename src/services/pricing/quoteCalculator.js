const { PROPERTY_TYPES, PRICING_STATUS } = require('../../constants/propertyTypes');
const { vatEnabled, vatRate } = require('../../config/env');
const { Bundle } = require('../../models');
const { getZoneBySortOrder } = require('../../constants/londonZones');
const { resolveRegionByPostcode } = require('./regionResolver');
const { loadRegionPriceMap } = require('./priceLookup');
const {
  loadPricingContext,
  evaluateResidentialLinesFromRules,
  evaluateQuoteOnlyLinesFromRules,
  evaluateBookingSurcharges,
} = require('./pricingEngine');
const { attachServiceDetailsToLines } = require('../lineItemDetails');

const round2 = (n) => Math.round(n * 100) / 100;

const summarizeQuote = (lines) => {
  const pricedLines = lines.filter((l) => !l.quoteOnly);
  const tbcCount = pricedLines.filter((l) => l.isTbc).length;
  const allTbc = pricedLines.length > 0 && tbcCount === pricedLines.length;
  const partialTbc = tbcCount > 0 && !allTbc;

  let subtotal = null;
  if (!allTbc && tbcCount === 0) {
    subtotal = round2(
      lines.reduce((sum, l) => {
        if (l.isTbc || l.quoteOnly || l.total === null) return sum;
        return sum + l.total;
      }, 0)
    );
  } else if (partialTbc) {
    const partial = lines.reduce((sum, l) => {
      if (l.isTbc || l.quoteOnly || l.total === null) return sum;
      return sum + l.total;
    }, 0);
    subtotal = round2(partial);
  }

  let vat = 0;
  let total = subtotal;
  if (subtotal !== null && vatEnabled) {
    vat = round2(subtotal * vatRate);
    total = round2(subtotal + vat);
  }

  let pricingStatus = PRICING_STATUS.PRICED;
  if (allTbc) pricingStatus = PRICING_STATUS.ALL_TBC;
  else if (partialTbc || lines.some((l) => l.quoteOnly)) pricingStatus = PRICING_STATUS.PARTIAL_TBC;

  return { subtotal, vat, total, pricingStatus };
};

const calculateQuote = async ({
  propertyType,
  postcode,
  services: selections = [],
  activeBundleKeys = [],
  congestionZone = false,
  parkingAvailable = true,
}) => {
  const region = await resolveRegionByPostcode(postcode);
  const noRegion = !region;
  const priceMap = await loadRegionPriceMap(region?.id ?? null);
  const zoneConfig = region ? getZoneBySortOrder(region.sortOrder) : null;

  let effectiveCongestion = congestionZone;
  let effectiveParking = parkingAvailable;
  if (zoneConfig?.autoCongestionParking) {
    effectiveCongestion = true;
    effectiveParking = false;
  }

  const serviceCodes = selections.map((s) => s.code);
  const context = await loadPricingContext(propertyType, serviceCodes);

  let lines = [];

  if (propertyType === PROPERTY_TYPES.RESIDENTIAL) {
    lines = evaluateResidentialLinesFromRules(
      selections,
      activeBundleKeys,
      priceMap,
      noRegion,
      context
    );
  } else {
    lines = evaluateQuoteOnlyLinesFromRules(selections, priceMap, noRegion, context);
  }

  if (propertyType === PROPERTY_TYPES.RESIDENTIAL) {
    lines.push(
      ...evaluateBookingSurcharges(
        context.rules,
        { congestionZone: effectiveCongestion, parkingAvailable: effectiveParking },
        priceMap,
        noRegion
      )
    );
  }

  lines = attachServiceDetailsToLines(lines, context, selections);

  const summary = summarizeQuote(lines);

  return {
    resolvedRegion: region ? { id: region.id, name: region.name } : null,
    lines,
    ...summary,
    vatEnabled,
  };
};

/** Only auto-infer bundles when explicitBundles is omitted (not when client sends []). */
const inferActiveBundles = async (propertyType, selections, explicitBundles) => {
  if (explicitBundles !== undefined && explicitBundles !== null) {
    return explicitBundles;
  }
  const codes = new Set(selections.map((s) => s.code));
  const bundles = await Bundle.findAll({ where: { propertyType } });
  const active = [];
  for (const b of bundles) {
    if (b.serviceCodes.every((c) => codes.has(c))) active.push(b.bundleKey);
  }
  return active;
};

/** True if any non-discount, non-quote-only line is TBC (residential should use quotation flow). */
const quoteRequiresQuotation = (lines) =>
  lines.some((l) => !l.isDiscount && !l.quoteOnly && l.isTbc);

module.exports = {
  calculateQuote,
  inferActiveBundles,
  quoteRequiresQuotation,
};
