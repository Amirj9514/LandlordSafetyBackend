const { PROPERTY_TYPES, PRICING_STATUS, PRICING_MODES } = require('../../constants/propertyTypes');
const { vatEnabled, vatRate } = require('../../config/env');
const { Service, Bundle } = require('../../models');
const { resolveRegionByPostcode } = require('./regionResolver');
const { loadRegionPriceMap, getPrice, lineFromPrice } = require('./priceLookup');

const round2 = (n) => Math.round(n * 100) / 100;

const hasBundle = (activeBundleKeys, key) => activeBundleKeys?.includes(key);

const hasService = (selections, code) => selections.some((s) => s.code === code);

const getAnswers = (selection) => selection.answers || {};

const SVC = {
  gsc: 'Gas Safety Certificate (CP12)',
  boiler: 'Boiler Service',
  eicr: 'EICR',
  pat: 'PAT Testing',
  fsc: 'Fire Alarm Certificate (FSC)',
  elc: 'Emergency Light Certificate (ELC)',
  fra: 'Fire Safety Risk Assessment (FRA)',
  epc: 'Energy Performance Certificate (EPC)',
  floorplan: 'Floor Plan',
  asbestos: 'Asbestos Survey',
};

const calcResidentialLines = (selections, activeBundleKeys, priceMap, noRegion) => {
  const lines = [];
  const sel = (code) => selections.find((s) => s.code === code);
  const gscBundle = hasBundle(activeBundleKeys, 'bundle-gsc-boiler');
  const eicrPatBundle = hasBundle(activeBundleKeys, 'bundle-eicr-pat');
  const fscElcFraBundle = hasBundle(activeBundleKeys, 'bundle-fsc-elc-fra');
  const fscElcBundle = hasBundle(activeBundleKeys, 'bundle-fsc-elc');
  const epcFpBundle = hasBundle(activeBundleKeys, 'bundle-epc-fp');

  if (hasService(selections, 'gsc')) {
    const a = getAnswers(sel('gsc'));
    const count = parseInt(a.applianceCount, 10) || 0;
    if (count >= 1 && count <= 5) {
      const tierKey = `gsc_meter_${count}`;
      const p = getPrice(priceMap, tierKey, noRegion);
      lines.push(lineFromPrice({
        name: SVC.gsc,
        sub: `Meter & ${count} appliance${count > 1 ? 's' : ''}`,
        amount: p.amount,
        isTbc: p.isTbc,
        pricingTierId: p.pricingTierId,
        serviceCode: 'gsc',
        serviceName: SVC.gsc,
      }));
      if (a.coAlarmPresent === 'no' && a.coAlarmInstall === 'yes') {
        const co = getPrice(priceMap, 'co_alarm_install', noRegion);
        lines.push(lineFromPrice({
          name: 'CO Alarm Installation',
          sub: '',
          amount: co.amount,
          isTbc: co.isTbc,
          pricingTierId: co.pricingTierId,
          serviceCode: 'gsc',
          serviceName: SVC.gsc,
        }));
      }
    }
  }

  if (hasService(selections, 'boiler')) {
    const a = getAnswers(sel('boiler'));
    const type = a.boilerType;
    if (type === 'basic' || type === 'full') {
      const standaloneKey =
        type === 'basic' ? 'boiler_basic_standalone' : 'boiler_full_standalone';
      const sub = type === 'basic' ? 'Basic Boiler Service' : 'Full Boiler Service';
      const p = getPrice(priceMap, standaloneKey, noRegion);
      lines.push(lineFromPrice({
        name: SVC.boiler,
        sub,
        amount: p.amount,
        isTbc: p.isTbc,
        pricingTierId: p.pricingTierId,
        serviceCode: 'boiler',
        serviceName: SVC.boiler,
      }));

      if (gscBundle && hasService(selections, 'gsc')) {
        const discKey =
          type === 'basic' ? 'bundle_gsc_boiler_basic' : 'bundle_gsc_boiler_full';
        const disc = getPrice(priceMap, discKey, noRegion);
        if (!disc.isTbc && disc.amount !== null) {
          lines.push(lineFromPrice({
            name: 'Bundle Discount — GSC + Boiler Service',
            sub: 'Bundle selected',
            amount: -disc.amount,
            isTbc: false,
            pricingTierId: disc.pricingTierId,
            isDiscount: true,
          }));
        }
      }
    }
  }

  if (hasService(selections, 'eicr')) {
    const a = getAnswers(sel('eicr'));
    const bedMap = {
      studio: 'eicr_studio',
      '1-3': 'eicr_bed_1_3',
      '4': 'eicr_bed_4',
      '5': 'eicr_bed_5',
      '6': 'eicr_bed_6',
      '7': 'eicr_bed_7',
      '8': 'eicr_bed_8',
    };
    const tierKey = bedMap[a.bedrooms];
    if (tierKey) {
      const base = getPrice(priceMap, tierKey, noRegion);
      let total = base.isTbc ? null : base.amount;
      const boards = parseInt(a.fuseBoards, 10) || 1;
      if (!base.isTbc && boards > 1) {
        const boardKey = `eicr_board_${boards}`;
        const boardExtra = getPrice(priceMap, boardKey, noRegion);
        if (boardExtra.isTbc) total = null;
        else total = round2(total + boardExtra.amount);
      }
      lines.push(lineFromPrice({
        name: SVC.eicr,
        sub: `${a.bedrooms} bedrooms${boards > 1 ? `, ${boards} fuse boards` : ''}`,
        amount: total,
        isTbc: base.isTbc || total === null,
        pricingTierId: base.pricingTierId,
        serviceCode: 'eicr',
        serviceName: SVC.eicr,
      }));
    }
  }

  if (hasService(selections, 'pat')) {
    const a = getAnswers(sel('pat'));
    const count = parseInt(a.applianceCount, 10) || 0;
    if (count > 0) {
      const withEicr = hasService(selections, 'eicr');
      let price = null;
      let isTbc = noRegion || !priceMap;
      if (!isTbc) {
        if (withEicr && eicrPatBundle) {
          const flat = getPrice(priceMap, 'pat_with_eicr_1_10', noRegion);
          const perExtra = getPrice(priceMap, 'pat_per_extra_appliance', noRegion);
          if (flat.isTbc) isTbc = true;
          else {
            price = count <= 10 ? flat.amount : round2(flat.amount + (count - 10) * perExtra.amount);
          }
        } else {
          const flat = getPrice(priceMap, 'pat_flat_1_10', noRegion);
          const perExtra = getPrice(priceMap, 'pat_per_extra_appliance', noRegion);
          if (flat.isTbc) isTbc = true;
          else {
            price = count <= 10 ? flat.amount : round2(flat.amount + (count - 10) * perExtra.amount);
          }
        }
      }
      lines.push(lineFromPrice({
        name: SVC.pat,
        sub: `${count} appliance${count > 1 ? 's' : ''}`,
        amount: price,
        isTbc,
        pricingTierId: null,
        serviceCode: 'pat',
        serviceName: SVC.pat,
      }));
      if (eicrPatBundle && withEicr && count > 0 && !isTbc) {
        const disc = getPrice(priceMap, 'bundle_eicr_pat_total', noRegion);
        if (!disc.isTbc && disc.amount !== null) {
          lines.push(lineFromPrice({
            name: 'Bundle Discount — EICR + PAT',
            sub: 'Bundle selected',
            amount: -disc.amount,
            isTbc: false,
            pricingTierId: disc.pricingTierId,
            isDiscount: true,
          }));
        }
      }
    }
  }

  if (hasService(selections, 'fsc')) {
    const a = getAnswers(sel('fsc'));
    const alarms = parseInt(a.alarmCount, 10) || 0;
    if (alarms > 0) {
      const isPremium = a.propertySubtype === 'premium';
      const baseKey = isPremium ? 'fsc_premium_base' : 'fsc_standard_base';
      const base = getPrice(priceMap, baseKey, noRegion);
      let total = base.isTbc ? null : base.amount;
      if (!base.isTbc && alarms > 3) {
        const extra = getPrice(priceMap, 'fsc_alarm_extra', noRegion);
        if (extra.isTbc) total = null;
        else total = round2(total + (alarms - 3) * extra.amount);
      }
      lines.push(lineFromPrice({
        name: SVC.fsc,
        sub: `${alarms} alarm${alarms > 1 ? 's' : ''}`,
        amount: total,
        isTbc: base.isTbc || total === null,
        pricingTierId: base.pricingTierId,
        serviceCode: 'fsc',
        serviceName: SVC.fsc,
      }));
    }
  }

  if (hasService(selections, 'elc')) {
    const a = getAnswers(sel('elc'));
    const lights = parseInt(a.lightCount, 10) || 0;
    if (lights > 0) {
      const base = getPrice(priceMap, 'elc_base', noRegion);
      let total = base.isTbc ? null : base.amount;
      if (!base.isTbc && lights > 3) {
        const extra = getPrice(priceMap, 'elc_light_extra', noRegion);
        if (extra.isTbc) total = null;
        else total = round2(total + (lights - 3) * extra.amount);
      }
      lines.push(lineFromPrice({
        name: SVC.elc,
        sub: `${lights} light${lights > 1 ? 's' : ''}`,
        amount: total,
        isTbc: base.isTbc || total === null,
        pricingTierId: base.pricingTierId,
        serviceCode: 'elc',
        serviceName: SVC.elc,
      }));
    }
  }

  if (hasService(selections, 'fra')) {
    const a = getAnswers(sel('fra'));
    const beds = parseInt(a.bedrooms, 10) || 0;
    const communal = parseInt(a.communalAreas, 10) || 1;
    if (beds > 0) {
      const base = getPrice(priceMap, 'fra_base', noRegion);
      let total = base.isTbc ? null : base.amount;
      if (!base.isTbc && beds > 3) {
        const bedExtra = getPrice(priceMap, 'fra_bed_extra', noRegion);
        if (bedExtra.isTbc) total = null;
        else total = round2(total + (beds - 3) * bedExtra.amount);
      }
      if (!base.isTbc && total !== null && communal > 1) {
        const commExtra = getPrice(priceMap, 'fra_communal_extra', noRegion);
        if (commExtra.isTbc) total = null;
        else total = round2(total + (communal - 1) * commExtra.amount);
      }
      lines.push(lineFromPrice({
        name: SVC.fra,
        sub: `${beds} bed${beds > 1 ? 's' : ''}, ${communal} communal area${communal > 1 ? 's' : ''}`,
        amount: total,
        isTbc: base.isTbc || total === null,
        pricingTierId: base.pricingTierId,
        serviceCode: 'fra',
        serviceName: SVC.fra,
      }));
    }
  }

  if (fscElcFraBundle && hasService(selections, 'fsc') && hasService(selections, 'elc') && hasService(selections, 'fra')) {
    const disc = getPrice(priceMap, 'bundle_fsc_elc_fra', noRegion);
    if (!disc.isTbc && disc.amount !== null) {
      lines.push(lineFromPrice({
        name: 'Bundle Discount — FSC + ELC + FRA',
        sub: 'Bundle selected',
        amount: -disc.amount,
        isTbc: false,
        pricingTierId: disc.pricingTierId,
        isDiscount: true,
      }));
    }
  } else if (fscElcBundle && hasService(selections, 'fsc') && hasService(selections, 'elc')) {
    const disc = getPrice(priceMap, 'bundle_fsc_elc', noRegion);
    if (!disc.isTbc && disc.amount !== null) {
      lines.push(lineFromPrice({
        name: 'Bundle Discount — FSC + ELC',
        sub: 'Bundle selected',
        amount: -disc.amount,
        isTbc: false,
        pricingTierId: disc.pricingTierId,
        isDiscount: true,
      }));
    }
  }

  if (hasService(selections, 'epc')) {
    const a = getAnswers(sel('epc'));
    const bedMap = {
      '1-3': 'epc_bed_1_3',
      '4': 'epc_bed_4',
      '5': 'epc_bed_5',
      '6': 'epc_bed_6',
      '7+': 'epc_bed_7_plus',
    };
    const tierKey = bedMap[a.bedrooms];
    if (tierKey) {
      const p = getPrice(priceMap, tierKey, noRegion);
      lines.push(lineFromPrice({
        name: SVC.epc,
        sub: a.bedrooms === '7+' ? '7+ bedrooms' : `${a.bedrooms} bedrooms`,
        amount: p.amount,
        isTbc: p.isTbc || tierKey === 'epc_bed_7_plus',
        pricingTierId: p.pricingTierId,
        quoteOnly: tierKey === 'epc_bed_7_plus',
        serviceCode: 'epc',
        serviceName: SVC.epc,
      }));
    }
  }

  if (hasService(selections, 'floorplan')) {
    const a = getAnswers(sel('floorplan'));
    const beds = parseInt(a.bedrooms, 10) || 0;
    const floors = parseInt(a.floors, 10) || 1;
    if (beds > 0) {
      let tierKey = 'fp_bed_1_2';
      if (beds === 3) tierKey = 'fp_bed_3';
      else if (beds === 4) tierKey = 'fp_bed_4';
      else if (beds === 5) tierKey = 'fp_bed_5';
      else if (beds >= 6) tierKey = 'fp_bed_6_plus';

      const base = getPrice(priceMap, tierKey, noRegion);
      let total = base.isTbc ? null : base.amount;
      if (!base.isTbc && floors > 1) {
        const floorExtra = getPrice(priceMap, 'fp_floor_extra', noRegion);
        if (floorExtra.isTbc) total = null;
        else total = round2(total + (floors - 1) * floorExtra.amount);
      }
      lines.push(lineFromPrice({
        name: SVC.floorplan,
        sub: `${beds} bed${beds > 1 ? 's' : ''}, ${floors} floor${floors > 1 ? 's' : ''}`,
        amount: total,
        isTbc: base.isTbc || total === null,
        pricingTierId: base.pricingTierId,
        serviceCode: 'floorplan',
        serviceName: SVC.floorplan,
      }));

      if (epcFpBundle && hasService(selections, 'epc') && !base.isTbc && total !== null) {
        const disc = getPrice(priceMap, 'bundle_epc_floorplan', noRegion);
        if (!disc.isTbc && disc.amount !== null) {
          lines.push(lineFromPrice({
            name: 'Bundle Discount — EPC + Floor Plan',
            sub: 'Bundle selected',
            amount: -disc.amount,
            isTbc: false,
            pricingTierId: disc.pricingTierId,
            isDiscount: true,
          }));
        }
      }
    }
  }

  if (hasService(selections, 'asbestos')) {
    const a = getAnswers(sel('asbestos'));
    if (a.configuration === 'house_3bed') {
      const p = getPrice(priceMap, 'asbestos_house_3bed', noRegion);
      lines.push(lineFromPrice({
        name: SVC.asbestos,
        sub: 'House — up to 3 bedrooms (Full Test)',
        amount: p.amount,
        isTbc: p.isTbc,
        pricingTierId: p.pricingTierId,
        serviceCode: 'asbestos',
        serviceName: SVC.asbestos,
      }));
    } else {
      lines.push(lineFromPrice({
        name: SVC.asbestos,
        sub: 'Custom configuration — quote required',
        amount: null,
        isTbc: true,
        quoteOnly: true,
        pricingTierId: null,
        serviceCode: 'asbestos',
        serviceName: SVC.asbestos,
      }));
    }
  }

  return lines;
};

const calcQuoteOnlyLines = async (selections, priceMap, noRegion) => {
  const lines = [];
  const services = await Service.findAll({
    where: { code: selections.map((s) => s.code) },
  });
  const byCode = Object.fromEntries(services.map((s) => [s.code, s]));

  for (const sel of selections) {
    const svc = byCode[sel.code];
    if (!svc) continue;
    const meta = svc.metadata || {};
    if (svc.pricingMode === PRICING_MODES.QUOTE_ONLY) {
      lines.push(lineFromPrice({
        name: svc.name,
        sub: 'Quote on request',
        amount: null,
        isTbc: false,
        quoteOnly: true,
        pricingTierId: null,
        serviceCode: svc.code,
        serviceName: svc.name,
      }));
    } else if (svc.pricingMode === PRICING_MODES.STARTS_FROM) {
      const tierKey = meta.startsFromTierKey;
      const p = tierKey ? getPrice(priceMap, tierKey, noRegion) : { amount: meta.startsFrom ?? null, isTbc: noRegion };
      const amount = tierKey ? p.amount : meta.startsFrom;
      lines.push(lineFromPrice({
        name: svc.name,
        sub: amount != null ? `Starts from £${amount.toFixed(2)}` : 'Starts from — TBC',
        amount: null,
        isTbc: noRegion || amount === null,
        quoteOnly: true,
        pricingTierId: p.pricingTierId ?? null,
        metadata: { startsFrom: amount },
        serviceCode: svc.code,
        serviceName: svc.name,
      }));
    }
  }
  return lines;
};

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

  let lines = [];

  if (propertyType === PROPERTY_TYPES.RESIDENTIAL) {
    lines = calcResidentialLines(selections, activeBundleKeys, priceMap, noRegion);
  } else {
    lines = await calcQuoteOnlyLines(selections, priceMap, noRegion);
  }

  if (propertyType === PROPERTY_TYPES.RESIDENTIAL) {
    if (congestionZone) {
      const p = getPrice(priceMap, 'congestion_charge', noRegion);
      lines.push(lineFromPrice({
        name: 'Congestion Charge',
        sub: 'London Congestion Zone',
        amount: p.amount,
        isTbc: p.isTbc,
        pricingTierId: p.pricingTierId,
      }));
    }
    if (!parkingAvailable) {
      const p = getPrice(priceMap, 'parking_charge', noRegion);
      lines.push(lineFromPrice({
        name: 'Parking Charge',
        sub: 'No parking available at property',
        amount: p.amount,
        isTbc: p.isTbc,
        pricingTierId: p.pricingTierId,
      }));
    }
  }

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
  calcResidentialLines,
  quoteRequiresQuotation,
};
