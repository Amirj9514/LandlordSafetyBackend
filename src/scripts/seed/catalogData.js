const { PROPERTY_TYPES, PRICING_MODES } = require('../../constants/propertyTypes');

const PT = PROPERTY_TYPES;
const PM = PRICING_MODES;

/** @type {Array<{ code: string, name: string, propertyType: string, displayOrder: number }>} */
const categories = [
  { code: 'res_gas', name: 'Gas', propertyType: PT.RESIDENTIAL, displayOrder: 1 },
  { code: 'res_fire', name: 'Fire Safety', propertyType: PT.RESIDENTIAL, displayOrder: 2 },
  { code: 'res_electrical', name: 'Electrical', propertyType: PT.RESIDENTIAL, displayOrder: 3 },
  { code: 'res_epc', name: 'EPC & Survey', propertyType: PT.RESIDENTIAL, displayOrder: 4 },
  { code: 'res_other', name: 'Other', propertyType: PT.RESIDENTIAL, displayOrder: 5 },
  { code: 'com_gas', name: 'Commercial Gas', propertyType: PT.COMMERCIAL, displayOrder: 1 },
  { code: 'com_electrical', name: 'Commercial Electrical', propertyType: PT.COMMERCIAL, displayOrder: 2 },
  { code: 'com_fire', name: 'Commercial Fire Safety', propertyType: PT.COMMERCIAL, displayOrder: 3 },
  { code: 'com_epc', name: 'Commercial EPC & Survey', propertyType: PT.COMMERCIAL, displayOrder: 4 },
  { code: 'inst_electrical', name: 'Electrical Installation & Repair', propertyType: PT.INSTALLATION, displayOrder: 1 },
  { code: 'inst_gas', name: 'Gas Installation & Repair', propertyType: PT.INSTALLATION, displayOrder: 2 },
  { code: 'inst_fire', name: 'Fire Installation & Repair', propertyType: PT.INSTALLATION, displayOrder: 3 },
];

/** Pricing tiers — amounts seeded per region in seedRegionPricesDefault */
const pricingTiers = [
  { tierKey: 'gsc_meter_1', label: 'Meter & 1 appliance', serviceCode: 'gsc', sortOrder: 1 },
  { tierKey: 'gsc_meter_2', label: 'Meter & 2 appliances', serviceCode: 'gsc', sortOrder: 2 },
  { tierKey: 'gsc_meter_3', label: 'Meter & 3 appliances', serviceCode: 'gsc', sortOrder: 3 },
  { tierKey: 'gsc_meter_4', label: 'Meter & 4 appliances', serviceCode: 'gsc', sortOrder: 4 },
  { tierKey: 'gsc_meter_5', label: 'Meter & 5 appliances', serviceCode: 'gsc', sortOrder: 5 },
  { tierKey: 'co_alarm_install', label: 'CO Alarm installation', serviceCode: 'gsc', sortOrder: 10 },
  { tierKey: 'boiler_basic_standalone', label: 'Basic Boiler Service (standalone)', serviceCode: 'boiler', sortOrder: 1 },
  { tierKey: 'boiler_full_standalone', label: 'Full Boiler Service (standalone)', serviceCode: 'boiler', sortOrder: 2 },
  { tierKey: 'boiler_basic_bundle_addon', label: 'Basic Boiler Service (GSC bundle add-on)', serviceCode: 'boiler', sortOrder: 3 },
  { tierKey: 'boiler_full_bundle_addon', label: 'Full Boiler Service (GSC bundle add-on)', serviceCode: 'boiler', sortOrder: 4 },
  { tierKey: 'eicr_studio', label: 'EICR Studio', serviceCode: 'eicr', sortOrder: 1 },
  { tierKey: 'eicr_bed_1_3', label: 'EICR 1-3 bedrooms', serviceCode: 'eicr', sortOrder: 2 },
  { tierKey: 'eicr_bed_4', label: 'EICR 4 bedrooms', serviceCode: 'eicr', sortOrder: 3 },
  { tierKey: 'eicr_bed_5', label: 'EICR 5 bedrooms', serviceCode: 'eicr', sortOrder: 4 },
  { tierKey: 'eicr_bed_6', label: 'EICR 6 bedrooms', serviceCode: 'eicr', sortOrder: 5 },
  { tierKey: 'eicr_bed_7', label: 'EICR 7 bedrooms', serviceCode: 'eicr', sortOrder: 6 },
  { tierKey: 'eicr_bed_8', label: 'EICR 8 bedrooms', serviceCode: 'eicr', sortOrder: 7 },
  { tierKey: 'eicr_board_2', label: 'EICR 2 fuse boards', serviceCode: 'eicr', sortOrder: 10 },
  { tierKey: 'eicr_board_3', label: 'EICR 3 fuse boards', serviceCode: 'eicr', sortOrder: 11 },
  { tierKey: 'eicr_board_4', label: 'EICR 4 fuse boards', serviceCode: 'eicr', sortOrder: 12 },
  { tierKey: 'pat_flat_1_10', label: 'PAT 1-10 appliances', serviceCode: 'pat', sortOrder: 1 },
  { tierKey: 'pat_per_extra_appliance', label: 'PAT per appliance above 10', serviceCode: 'pat', sortOrder: 2 },
  { tierKey: 'pat_with_eicr_1_10', label: 'PAT 1-10 with EICR bundle', serviceCode: 'pat', sortOrder: 3 },
  { tierKey: 'fsc_standard_base', label: 'FSC standard base (1-3 alarms)', serviceCode: 'fsc', sortOrder: 1 },
  { tierKey: 'fsc_premium_base', label: 'FSC premium base (1-3 alarms)', serviceCode: 'fsc', sortOrder: 2 },
  { tierKey: 'fsc_alarm_extra', label: 'FSC each alarm above 3', serviceCode: 'fsc', sortOrder: 3 },
  { tierKey: 'elc_base', label: 'ELC base (1-3 lights)', serviceCode: 'elc', sortOrder: 1 },
  { tierKey: 'elc_light_extra', label: 'ELC each light above 3', serviceCode: 'elc', sortOrder: 2 },
  { tierKey: 'fra_base', label: 'FRA base (1-3 beds, 1 communal)', serviceCode: 'fra', sortOrder: 1 },
  { tierKey: 'fra_bed_extra', label: 'FRA each bedroom above 3', serviceCode: 'fra', sortOrder: 2 },
  { tierKey: 'fra_communal_extra', label: 'FRA each communal above 1', serviceCode: 'fra', sortOrder: 3 },
  { tierKey: 'epc_bed_1_3', label: 'EPC 1-3 bedrooms', serviceCode: 'epc', sortOrder: 1 },
  { tierKey: 'epc_bed_4', label: 'EPC 4 bedrooms', serviceCode: 'epc', sortOrder: 2 },
  { tierKey: 'epc_bed_5', label: 'EPC 5 bedrooms', serviceCode: 'epc', sortOrder: 3 },
  { tierKey: 'epc_bed_6', label: 'EPC 6 bedrooms', serviceCode: 'epc', sortOrder: 4 },
  { tierKey: 'epc_bed_7_plus', label: 'EPC 7+ bedrooms', serviceCode: 'epc', sortOrder: 5, isTbcByDefault: true },
  { tierKey: 'fp_bed_1_2', label: 'Floor Plan 1-2 bedrooms', serviceCode: 'floorplan', sortOrder: 1 },
  { tierKey: 'fp_bed_3', label: 'Floor Plan 3 bedrooms', serviceCode: 'floorplan', sortOrder: 2 },
  { tierKey: 'fp_bed_4', label: 'Floor Plan 4 bedrooms', serviceCode: 'floorplan', sortOrder: 3 },
  { tierKey: 'fp_bed_5', label: 'Floor Plan 5 bedrooms', serviceCode: 'floorplan', sortOrder: 4 },
  { tierKey: 'fp_bed_6_plus', label: 'Floor Plan 6+ bedrooms', serviceCode: 'floorplan', sortOrder: 5 },
  { tierKey: 'fp_floor_extra', label: 'Floor Plan each floor above 1', serviceCode: 'floorplan', sortOrder: 6 },
  { tierKey: 'asbestos_house_3bed', label: 'Asbestos House up to 3 bed', serviceCode: 'asbestos', sortOrder: 1 },
  { tierKey: 'bundle_gsc_boiler_basic', label: 'Bundle discount GSC+Basic Boiler', serviceCode: null, sortOrder: 100 },
  { tierKey: 'bundle_gsc_boiler_full', label: 'Bundle discount GSC+Full Boiler', serviceCode: null, sortOrder: 101 },
  { tierKey: 'bundle_eicr_pat_total', label: 'Bundle discount EICR+PAT total', serviceCode: null, sortOrder: 102 },
  { tierKey: 'bundle_fsc_elc', label: 'Bundle discount FSC+ELC', serviceCode: null, sortOrder: 103 },
  { tierKey: 'bundle_fsc_elc_fra', label: 'Bundle discount FSC+ELC+FRA', serviceCode: null, sortOrder: 104 },
  { tierKey: 'bundle_epc_floorplan', label: 'Bundle discount EPC+Floor Plan', serviceCode: null, sortOrder: 105 },
  { tierKey: 'congestion_charge', label: 'Congestion Charge', serviceCode: null, sortOrder: 200 },
  { tierKey: 'parking_charge', label: 'Parking Charge', serviceCode: null, sortOrder: 201 },
  { tierKey: 'cp17_starts_from', label: 'CP17 starts from', serviceCode: 'cp17', sortOrder: 1 },
  { tierKey: 'cp42_starts_from', label: 'CP42 starts from', serviceCode: 'cp42', sortOrder: 1 },
  { tierKey: 'cp15_starts_from', label: 'CP15 starts from', serviceCode: 'cp15', sortOrder: 1 },
  { tierKey: 'cp44_starts_from', label: 'CP44 starts from', serviceCode: 'cp44', sortOrder: 1 },
  { tierKey: 'com_eicr_starts_from', label: 'Commercial EICR starts from', serviceCode: 'com_eicr', sortOrder: 1 },
  { tierKey: 'com_pat_starts_from', label: 'Commercial PAT starts from', serviceCode: 'com_pat', sortOrder: 1 },
  { tierKey: 'cepc_starts_from', label: 'Commercial EPC starts from', serviceCode: 'cepc', sortOrder: 1 },
  { tierKey: 'inst_electrical_starts_from', label: 'Electrical install starts from', serviceCode: 'inst_electrical', sortOrder: 1 },
  { tierKey: 'inst_boiler_starts_from', label: 'New boiler install starts from', serviceCode: 'inst_new_boiler', sortOrder: 1 },
  { tierKey: 'inst_cooker_starts_from', label: 'Cooker install starts from', serviceCode: 'inst_cooker', sortOrder: 1 },
  { tierKey: 'inst_fire_alarm_starts_from', label: 'Fire alarm install per alarm', serviceCode: 'inst_fire_alarm', sortOrder: 1 },
  { tierKey: 'inst_emergency_light_starts_from', label: 'Emergency light install per light', serviceCode: 'inst_emergency_light', sortOrder: 1 },
  { tierKey: 'inst_co_heat_starts_from', label: 'CO/Heat alarm install', serviceCode: 'inst_co_heat', sortOrder: 1 },
];

const residentialBundles = [
  { bundleKey: 'bundle-gsc-boiler', label: 'Gas Safety Cert + Boiler Service', propertyType: PT.RESIDENTIAL, serviceCodes: ['gsc', 'boiler'], discountTierKey: null, discountAmount: null, exclusionGroup: 'gsc-boiler', displayOrder: 1, metadata: { saveLabel: 'Save £20' } },
  { bundleKey: 'bundle-fsc-elc', label: 'FSC + ELC', propertyType: PT.RESIDENTIAL, serviceCodes: ['fsc', 'elc'], discountTierKey: 'bundle_fsc_elc', discountAmount: 20, exclusionGroup: 'fire-bundle', displayOrder: 2, metadata: { saveLabel: 'Save £20' } },
  { bundleKey: 'bundle-fsc-elc-fra', label: 'FSC + ELC + FRA', propertyType: PT.RESIDENTIAL, serviceCodes: ['fsc', 'elc', 'fra'], discountTierKey: 'bundle_fsc_elc_fra', discountAmount: 40, exclusionGroup: 'fire-bundle', displayOrder: 3, metadata: { saveLabel: 'Save £40' } },
  { bundleKey: 'bundle-eicr-pat', label: 'EICR + PAT', propertyType: PT.RESIDENTIAL, serviceCodes: ['eicr', 'pat'], discountTierKey: 'bundle_eicr_pat_total', discountAmount: 10, exclusionGroup: null, displayOrder: 4, metadata: { saveLabel: 'Save £20' } },
  { bundleKey: 'bundle-epc-fp', label: 'EPC + Floor Plan', propertyType: PT.RESIDENTIAL, serviceCodes: ['epc', 'floorplan'], discountTierKey: 'bundle_epc_floorplan', discountAmount: 20, exclusionGroup: null, displayOrder: 5, metadata: { saveLabel: 'Save £20' } },
];

const gscQuestions = [
  { fieldKey: 'applianceCount', inputType: 'select', label: 'Number of appliances', options: [{ value: '1', tierKey: 'gsc_meter_1' }, { value: '2', tierKey: 'gsc_meter_2' }, { value: '3', tierKey: 'gsc_meter_3' }, { value: '4', tierKey: 'gsc_meter_4' }, { value: '5', tierKey: 'gsc_meter_5' }], validation: { required: true }, sortOrder: 1 },
  { fieldKey: 'coAlarmPresent', inputType: 'radio', label: 'CO Alarm present at property?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], validation: { required: true }, sortOrder: 2, conditionalLogic: { note: 'A CO alarm is mandatory where a boiler is installed.' } },
  { fieldKey: 'coAlarmInstall', inputType: 'radio', label: 'Add CO Alarm installation? (+£35)', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], validation: { required: true }, sortOrder: 3, conditionalLogic: { showWhen: { field: 'coAlarmPresent', equals: 'no' } } },
];

const boilerQuestions = [
  { fieldKey: 'boilerType', inputType: 'radio', label: 'Service type', options: [{ value: 'basic', label: 'Basic Service', tierKeyStandalone: 'boiler_basic_standalone', tierKeyBundle: 'boiler_basic_bundle_addon' }, { value: 'full', label: 'Full Service', tierKeyStandalone: 'boiler_full_standalone', tierKeyBundle: 'boiler_full_bundle_addon' }], validation: { required: true }, sortOrder: 1 },
];

const eicrQuestions = [
  { fieldKey: 'bedrooms', inputType: 'select', label: 'Number of bedrooms', options: [{ value: 'studio', tierKey: 'eicr_studio' }, { value: '1-3', tierKey: 'eicr_bed_1_3' }, { value: '4', tierKey: 'eicr_bed_4' }, { value: '5', tierKey: 'eicr_bed_5' }, { value: '6', tierKey: 'eicr_bed_6' }, { value: '7', tierKey: 'eicr_bed_7' }, { value: '8', tierKey: 'eicr_bed_8' }], validation: { required: true }, sortOrder: 1 },
  { fieldKey: 'fuseBoards', inputType: 'select', label: 'Number of fuse boards', options: [{ value: '1', tierKey: null }, { value: '2', tierKey: 'eicr_board_2' }, { value: '3', tierKey: 'eicr_board_3' }, { value: '4', tierKey: 'eicr_board_4' }], validation: { required: true }, sortOrder: 2 },
];

const patQuestions = [
  { fieldKey: 'applianceCount', inputType: 'number', label: 'Number of appliances to test', validation: { required: true, min: 1, max: 100 }, sortOrder: 1 },
];

const fscQuestions = [
  { fieldKey: 'propertySubtype', inputType: 'select', label: 'Property type', options: [{ value: 'standard', label: 'Flat / House / Small HMO (Grade D/LD2)' }, { value: 'premium', label: 'Large / Licensed HMO (Grade A/L2)' }, { value: 'block', label: 'Block of Flats — per unit' }], validation: { required: true }, sortOrder: 1 },
  { fieldKey: 'alarmCount', inputType: 'select', label: 'Number of fire alarms', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((n) => ({ value: n, label: n === '12' ? '12+' : n })), validation: { required: true }, sortOrder: 2 },
];

const elcQuestions = [
  { fieldKey: 'lightCount', inputType: 'select', label: 'Number of emergency lights', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((n) => ({ value: n, label: n === '12' ? '12+' : n })), validation: { required: true }, sortOrder: 1 },
];

const fraQuestions = [
  { fieldKey: 'propertySubtype', inputType: 'select', label: 'Property type', options: [{ value: 'house', label: 'House' }, { value: 'flat', label: 'Flat (single)' }, { value: 'hmo', label: 'HMO' }, { value: 'building', label: 'Building / Block' }, { value: 'sheltered', label: 'Sheltered / Care Home' }], validation: { required: true }, sortOrder: 1 },
  { fieldKey: 'bedrooms', inputType: 'select', label: 'Number of bedrooms', options: ['1', '2', '3', '4', '5', '6', '7', '8'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 2, conditionalLogic: { hideWhen: { field: 'propertySubtype', equals: 'flat' } } },
  { fieldKey: 'communalAreas', inputType: 'select', label: 'Number of communal areas', options: [{ value: '1', label: '1 (included)' }, { value: '2', label: '2 (+£60)' }, { value: '3', label: '3 (+£120)' }, { value: '4', label: '4 (+£180)' }, { value: '5', label: '5+ (+£240)' }], validation: { required: true }, sortOrder: 3 },
];

const epcQuestions = [
  { fieldKey: 'bedrooms', inputType: 'select', label: 'Number of bedrooms', options: [{ value: '1-3', tierKey: 'epc_bed_1_3' }, { value: '4', tierKey: 'epc_bed_4' }, { value: '5', tierKey: 'epc_bed_5' }, { value: '6', tierKey: 'epc_bed_6' }, { value: '7+', tierKey: 'epc_bed_7_plus', label: '7+ (TBC)' }], validation: { required: true }, sortOrder: 1 },
];

const floorplanQuestions = [
  { fieldKey: 'bedrooms', inputType: 'select', label: 'Bedrooms', options: ['1', '2', '3', '4', '5', '6'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 1 },
  { fieldKey: 'floors', inputType: 'select', label: 'Floors', options: [{ value: '1', label: '1 floor' }, { value: '2', label: '2 floors (+£25)' }, { value: '3', label: '3 floors (+£50)' }], validation: { required: true }, sortOrder: 2 },
];

const asbestosQuestions = [
  { fieldKey: 'configuration', inputType: 'select', label: 'Property configuration', options: [{ value: 'house_3bed', tierKey: 'asbestos_house_3bed', label: 'House — up to 3 bedrooms (Full Test)' }, { value: 'other', label: 'Other configuration — quote required' }], validation: { required: true }, sortOrder: 1 },
  { fieldKey: 'propertySizeSqm', inputType: 'number', label: 'Property size (SQM)', validation: { required: false, min: 1 }, sortOrder: 2 },
];

/** Services: categoryCode, code, name, pricingMode, displayOrder, parentCode?, metadata?, questions? */
const services = [
  // Residential
  { categoryCode: 'res_gas', code: 'gsc', name: 'Gas Safety Certificate (CP12)', propertyType: PT.RESIDENTIAL, pricingMode: PM.INSTANT, displayOrder: 1, questions: gscQuestions },
  { categoryCode: 'res_gas', code: 'boiler', name: 'Boiler Service', propertyType: PT.RESIDENTIAL, pricingMode: PM.INSTANT, displayOrder: 2, questions: boilerQuestions },
  { categoryCode: 'res_electrical', code: 'eicr', name: 'Electrical Installation Condition Report (EICR)', propertyType: PT.RESIDENTIAL, pricingMode: PM.INSTANT, displayOrder: 1, questions: eicrQuestions },
  { categoryCode: 'res_electrical', code: 'pat', name: 'Portable Appliance Test (PAT)', propertyType: PT.RESIDENTIAL, pricingMode: PM.INSTANT, displayOrder: 2, questions: patQuestions },
  { categoryCode: 'res_fire', code: 'fsc', name: 'Fire Alarm Certificate (FSC)', propertyType: PT.RESIDENTIAL, pricingMode: PM.INSTANT, displayOrder: 1, questions: fscQuestions },
  { categoryCode: 'res_fire', code: 'elc', name: 'Emergency Light Certificate (ELC)', propertyType: PT.RESIDENTIAL, pricingMode: PM.INSTANT, displayOrder: 2, questions: elcQuestions },
  { categoryCode: 'res_fire', code: 'fra', name: 'Fire Safety Risk Assessment (FRA)', propertyType: PT.RESIDENTIAL, pricingMode: PM.INSTANT, displayOrder: 3, questions: fraQuestions },
  { categoryCode: 'res_epc', code: 'epc', name: 'Energy Performance Certificate (EPC)', propertyType: PT.RESIDENTIAL, pricingMode: PM.INSTANT, displayOrder: 1, questions: epcQuestions },
  { categoryCode: 'res_epc', code: 'floorplan', name: 'Floor Plan', propertyType: PT.RESIDENTIAL, pricingMode: PM.INSTANT, displayOrder: 2, questions: floorplanQuestions },
  { categoryCode: 'res_other', code: 'asbestos', name: 'Asbestos Survey', propertyType: PT.RESIDENTIAL, pricingMode: PM.INSTANT, displayOrder: 1, questions: asbestosQuestions },

  // Commercial gas — CGSC parent + sub certs
  { categoryCode: 'com_gas', code: 'cgsc', name: 'Commercial Gas Safety Certificate', propertyType: PT.COMMERCIAL, pricingMode: PM.QUOTE_ONLY, displayOrder: 0, metadata: { isParent: true } },
  { categoryCode: 'com_gas', code: 'cp17', name: 'CP17 Non-Domestic Gas Installation Safety Report', propertyType: PT.COMMERCIAL, pricingMode: PM.STARTS_FROM, displayOrder: 1, parentCode: 'cgsc', metadata: { startsFromTierKey: 'cp17_starts_from' }, questions: [
    { fieldKey: 'applianceCount', inputType: 'select', label: 'Number of gas appliances', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '10+'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 1 },
    { fieldKey: 'gasInterlock', inputType: 'radio', label: 'Is there a gas interlock system?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'not_sure', label: 'Not sure' }], validation: { required: true }, sortOrder: 2 },
    { fieldKey: 'lastCp17Date', inputType: 'text', label: 'Date of last CP17 certificate', validation: { required: false }, sortOrder: 3 },
    { fieldKey: 'applianceNames', inputType: 'textarea', label: 'Name of Gas appliances', validation: { required: false }, sortOrder: 4 },
    { fieldKey: 'boilerServiceRequired', inputType: 'radio', label: 'Boiler service required?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], validation: { required: true }, sortOrder: 5, conditionalLogic: { hideWhenServiceSelected: 'cp15' } },
    { fieldKey: 'boilerCount', inputType: 'select', label: 'Number of boilers', options: ['1', '2', '3', '4', '5', '6+'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 6, conditionalLogic: { showWhen: { field: 'boilerServiceRequired', equals: 'yes' } } },
    { fieldKey: 'boilerKw', inputType: 'select', label: 'Boiler size (kW)', options: ['under_30', '30_70', '70_150', '150_500', '500_plus'].map((v) => ({ value: v, label: v })), validation: { required: true }, sortOrder: 7, conditionalLogic: { showWhen: { field: 'boilerServiceRequired', equals: 'yes' } } },
    { fieldKey: 'boilerMake', inputType: 'text', label: 'Boiler make / manufacturer', validation: { required: false }, sortOrder: 8, conditionalLogic: { showWhen: { field: 'boilerServiceRequired', equals: 'yes' } } },
  ] },
  { categoryCode: 'com_gas', code: 'cp42', name: 'CP42 Commercial Catering Gas Safety Certificate', propertyType: PT.COMMERCIAL, pricingMode: PM.STARTS_FROM, displayOrder: 2, parentCode: 'cgsc', metadata: { startsFromTierKey: 'cp42_starts_from' }, questions: [
    { fieldKey: 'kitchenAppliances', inputType: 'select', label: 'Number of kitchen appliances', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '10+'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 1 },
    { fieldKey: 'gasSupplyType', inputType: 'radio', label: 'Gas supply type', options: [{ value: 'mains', label: 'Natural Gas (mains)' }, { value: 'lpg', label: 'LPG' }, { value: 'both', label: 'Both' }], validation: { required: true }, sortOrder: 2 },
    { fieldKey: 'gasInterlock', inputType: 'radio', label: 'Is there a gas interlock system?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'not_sure', label: 'Not sure' }], validation: { required: true }, sortOrder: 3 },
    { fieldKey: 'extractionSystem', inputType: 'radio', label: 'Is there a working extraction / canopy system?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], validation: { required: true }, sortOrder: 4 },
    { fieldKey: 'lastCp42Date', inputType: 'text', label: 'Date of last CP42 certificate', validation: { required: false }, sortOrder: 5 },
    { fieldKey: 'cateringApplianceChecklist', inputType: 'appliance_checklist', label: 'Catering Appliance Checklist', options: [
      { value: 'cooker_range', label: 'Cooker / Range', category: 'Cooking' },
      { value: 'hob', label: 'Hob / Burner', category: 'Cooking' },
      { value: 'fryer', label: 'Fryer', category: 'Cooking' },
      { value: 'griddle', label: 'Griddle / Flat Grill', category: 'Cooking' },
      { value: 'grill', label: 'Grill / Salamander', category: 'Cooking' },
      { value: 'oven', label: 'Oven (standalone)', category: 'Cooking' },
      { value: 'pizza_oven', label: 'Pizza Oven', category: 'Cooking' },
      { value: 'tandoor', label: 'Tandoor Oven', category: 'Cooking' },
      { value: 'bbq', label: 'BBQ / Charbroiler (gas)', category: 'Cooking' },
      { value: 'bain_marie', label: 'Bain Marie (gas)', category: 'Catering Equipment' },
      { value: 'steamer', label: 'Steamer (gas)', category: 'Catering Equipment' },
      { value: 'water_boiler', label: 'Water Boiler / Urn (gas)', category: 'Catering Equipment' },
      { value: 'crepe_waffle', label: 'Crepe / Waffle Machine (gas)', category: 'Catering Equipment' },
      { value: 'gas_heating', label: 'Gas Fired Heating Unit', category: 'Heating' },
      { value: 'other', label: 'Other (describe in comments)', category: 'Other' },
    ], validation: { required: false }, sortOrder: 6 },
  ] },
  { categoryCode: 'com_gas', code: 'cp15', name: 'CP15 Commercial Boiler Gas Safety Record', propertyType: PT.COMMERCIAL, pricingMode: PM.STARTS_FROM, displayOrder: 3, parentCode: 'cgsc', metadata: { startsFromTierKey: 'cp15_starts_from', mergedBoilerWith: 'cp17' }, questions: [
    { fieldKey: 'boilerCount', inputType: 'select', label: 'Number of boilers', options: ['1', '2', '3', '4', '5', '6+'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 1, conditionalLogic: { hideWhenServiceSelected: 'cp17' } },
    { fieldKey: 'boilerKw', inputType: 'select', label: 'Boiler size (kW)', options: ['under_30', '30_70', '70_150', '150_500', '500_plus'].map((v) => ({ value: v, label: v })), validation: { required: true }, sortOrder: 2, conditionalLogic: { hideWhenServiceSelected: 'cp17' } },
    { fieldKey: 'boilerMake', inputType: 'text', label: 'Boiler make / manufacturer', validation: { required: false }, sortOrder: 3, conditionalLogic: { hideWhenServiceSelected: 'cp17' } },
    { fieldKey: 'lastBoilerServiceDate', inputType: 'text', label: 'Date of last boiler service', validation: { required: false }, sortOrder: 4, conditionalLogic: { hideWhenServiceSelected: 'cp17' } },
    { fieldKey: 'boilerServiceRequired', inputType: 'radio', label: 'Boiler service required?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], validation: { required: true }, sortOrder: 5, conditionalLogic: { hideWhenServiceSelected: 'cp17' } },
  ] },
  { categoryCode: 'com_gas', code: 'cp44', name: 'CP44 Commercial Mobile Catering Certificate (LPG)', propertyType: PT.COMMERCIAL, pricingMode: PM.STARTS_FROM, displayOrder: 4, parentCode: 'cgsc', metadata: { startsFromTierKey: 'cp44_starts_from' }, questions: [
    { fieldKey: 'unitType', inputType: 'select', label: 'Unit type', options: [{ value: 'van', label: 'Catering Van' }, { value: 'truck', label: 'Food Truck' }, { value: 'trailer', label: 'Catering Trailer' }, { value: 'stall', label: 'Market Stall' }, { value: 'horsebox', label: 'Horsebox Conversion' }, { value: 'other', label: 'Other' }], validation: { required: true }, sortOrder: 1 },
    { fieldKey: 'lpgApplianceCount', inputType: 'select', label: 'Number of LPG appliances', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '10+'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 2 },
    { fieldKey: 'cylinderSize', inputType: 'select', label: 'LPG cylinder size in use', options: ['3.9kg', '6kg', '11kg', '13kg', '19kg', '47kg', 'other'].map((v) => ({ value: v, label: v })), validation: { required: true }, sortOrder: 3 },
    { fieldKey: 'ffdPresent', inputType: 'radio', label: 'Do all appliances have Flame Failure Devices (FFD)?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'not_sure', label: 'Not sure' }], validation: { required: true }, sortOrder: 4 },
    { fieldKey: 'fireExtinguisher', inputType: 'radio', label: 'Is there a fire extinguisher on the unit?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], validation: { required: true }, sortOrder: 5 },
    { fieldKey: 'fireBlanket', inputType: 'radio', label: 'Is there a fire blanket on the unit?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], validation: { required: true }, sortOrder: 6 },
    { fieldKey: 'lastCp44Date', inputType: 'text', label: 'Date of last CP44 certificate', validation: { required: false }, sortOrder: 7 },
    { fieldKey: 'gasFaults', inputType: 'radio', label: 'Any known gas faults or concerns?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], validation: { required: true }, sortOrder: 8 },
    { fieldKey: 'gasFaultsDetail', inputType: 'textarea', label: 'Describe faults or concerns', validation: { required: true }, sortOrder: 9, conditionalLogic: { showWhen: { field: 'gasFaults', equals: 'yes' } } },
    { fieldKey: 'mobileApplianceChecklist', inputType: 'appliance_checklist', label: 'Appliance Checklist', options: [
      { value: 'cooker_range', label: 'Cooker / Range', category: 'Cooking' },
      { value: 'hob', label: 'Hob / Burner', category: 'Cooking' },
      { value: 'fryer', label: 'Fryer', category: 'Cooking' },
      { value: 'griddle', label: 'Griddle / Flat Grill', category: 'Cooking' },
      { value: 'grill', label: 'Grill / Salamander', category: 'Cooking' },
      { value: 'oven', label: 'Oven (standalone)', category: 'Cooking' },
      { value: 'pizza_oven', label: 'Pizza Oven', category: 'Cooking' },
      { value: 'tandoor', label: 'Tandoor Oven', category: 'Cooking' },
      { value: 'bbq', label: 'BBQ / Charbroiler (gas)', category: 'Cooking' },
      { value: 'bain_marie', label: 'Bain Marie (gas)', category: 'Catering Equipment' },
      { value: 'steamer', label: 'Steamer (gas)', category: 'Catering Equipment' },
      { value: 'water_boiler', label: 'Water Boiler / Urn (gas)', category: 'Catering Equipment' },
      { value: 'crepe_waffle', label: 'Crepe / Waffle Machine (gas)', category: 'Catering Equipment' },
      { value: 'gas_heating', label: 'Gas Fired Heating Unit', category: 'Heating' },
      { value: 'other', label: 'Other', category: 'Other' },
    ], validation: { required: false }, sortOrder: 10 },
  ] },

  // Commercial electrical
  { categoryCode: 'com_electrical', code: 'com_eicr', name: 'Commercial EICR', propertyType: PT.COMMERCIAL, pricingMode: PM.STARTS_FROM, displayOrder: 1, metadata: { startsFromTierKey: 'com_eicr_starts_from' }, questions: [
    { fieldKey: 'propertySubtype', inputType: 'select', label: 'Property type', section: 'Property & Installation Details', options: ['office', 'retail', 'restaurant', 'takeaway', 'hotel', 'school', 'care_home', 'hospital', 'warehouse', 'industrial', 'worship', 'mixed', 'other'].map((v) => ({ value: v, label: v })), validation: { required: true }, sortOrder: 1 },
    { fieldKey: 'consumerUnits', inputType: 'select', label: 'Number of consumer units / distribution boards', options: ['1', '2', '3', '4', '5', '6+'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 2 },
    { fieldKey: 'circuitCount', inputType: 'select', label: 'Number of circuits', options: [{ value: '1-12', label: '1–12' }, { value: '12-20', label: '12–20' }, { value: '20-30', label: '20–30' }, { value: '30-45', label: '30–45' }, { value: '45-60', label: '45–60' }, { value: '60-80', label: '60–80' }, { value: '80+', label: '80+' }], validation: { required: true }, sortOrder: 3 },
    { fieldKey: 'installationAge', inputType: 'select', label: 'Age of electrical installation', options: [{ value: 'under_5', label: 'Under 5 years' }, { value: '5_10', label: '5–10 years' }, { value: '10_25', label: '10–25 years' }, { value: '25_plus', label: '25+ years' }, { value: 'unknown', label: 'Unknown' }], validation: { required: true }, sortOrder: 4 },
    { fieldKey: 'powerIsolation', inputType: 'radio', label: 'Can power be isolated during inspection?', section: 'Access & Previous Certificate', options: [{ value: 'full', label: 'Yes — full isolation' }, { value: 'partial', label: 'Yes — partial only' }, { value: 'no', label: 'No — out of hours required' }], validation: { required: true }, sortOrder: 5 },
    { fieldKey: 'inspectionTime', inputType: 'radio', label: 'Preferred inspection time', options: [{ value: 'normal', label: 'Normal working hours' }, { value: 'out_of_hours', label: 'Out of hours' }, { value: 'either', label: 'Either' }], validation: { required: true }, sortOrder: 6 },
    { fieldKey: 'lastEicrDate', inputType: 'text', label: 'Date of last EICR', validation: { required: false }, sortOrder: 7 },
    { fieldKey: 'lastEicrSatisfactory', inputType: 'radio', label: 'Was the last EICR satisfactory?', options: [{ value: 'satisfactory', label: 'Satisfactory' }, { value: 'unsatisfactory', label: 'Unsatisfactory' }, { value: 'unknown', label: 'Not known' }], validation: { required: false }, sortOrder: 8 },
    { fieldKey: 'alterationsSinceEicr', inputType: 'radio', label: 'Any electrical alterations since last EICR?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'not_sure', label: 'Not sure' }], validation: { required: true }, sortOrder: 9 },
    { fieldKey: 'alterationsDetail', inputType: 'textarea', label: 'Describe the alterations', validation: { required: true }, sortOrder: 10, conditionalLogic: { showWhen: { field: 'alterationsSinceEicr', equals: 'yes' } } },
    { fieldKey: 'electricalFaults', inputType: 'radio', label: 'Any known electrical faults or concerns?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], validation: { required: true }, sortOrder: 11 },
    { fieldKey: 'electricalFaultsDetail', inputType: 'textarea', label: 'Describe faults or concerns', validation: { required: true }, sortOrder: 12, conditionalLogic: { showWhen: { field: 'electricalFaults', equals: 'yes' } } },
  ] },
  { categoryCode: 'com_electrical', code: 'com_pat', name: 'Commercial PAT Testing', propertyType: PT.COMMERCIAL, pricingMode: PM.STARTS_FROM, displayOrder: 2, metadata: { startsFromTierKey: 'com_pat_starts_from' }, questions: patQuestions },
  { categoryCode: 'com_fire', code: 'cfsc', name: 'CFSC Fire Alarm System Testing', propertyType: PT.COMMERCIAL, pricingMode: PM.QUOTE_ONLY, displayOrder: 1, questions: [
    { fieldKey: 'propertySubtype', inputType: 'select', label: 'Property type', options: ['office', 'retail', 'restaurant', 'takeaway', 'hotel', 'school', 'care_home', 'hospital', 'warehouse', 'industrial', 'worship', 'mixed', 'other'].map((v) => ({ value: v, label: v })), validation: { required: true }, sortOrder: 1 },
    { fieldKey: 'floors', inputType: 'select', label: 'Number of floors', options: ['1', '2', '3', '4', '5', '6+'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 2 },
    { fieldKey: 'systemGrade', inputType: 'radio', label: 'System grade', options: [{ value: 'a', label: 'Grade A (panel-based)' }, { value: 'b', label: 'Grade B (legacy panel)' }, { value: 'unknown', label: 'Not known' }], validation: { required: true }, sortOrder: 3 },
    { fieldKey: 'detectorCount', inputType: 'select', label: 'Number of detectors / alarms', options: ['1-3', '3-6', '6-10', '10-15', '15-25', '25+'].map((v) => ({ value: v, label: v })), validation: { required: true }, sortOrder: 4 },
    { fieldKey: 'callPointCount', inputType: 'select', label: 'Number of manual call points', options: ['1-3', '3-6', '6-10', '10-15', '15-25', '25+'].map((v) => ({ value: v, label: v })), validation: { required: true }, sortOrder: 5 },
    { fieldKey: 'controlPanel', inputType: 'radio', label: 'Is there a control panel?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'not_sure', label: 'Not sure' }], validation: { required: true }, sortOrder: 6 },
    { fieldKey: 'lastFireTestDate', inputType: 'text', label: 'Date of last fire alarm test', validation: { required: false }, sortOrder: 7 },
  ] },
  { categoryCode: 'com_fire', code: 'celc', name: 'Commercial Emergency Light Certificate', propertyType: PT.COMMERCIAL, pricingMode: PM.QUOTE_ONLY, displayOrder: 2, questions: [
    { fieldKey: 'lightCount', inputType: 'select', label: 'Number of emergency lights', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((n) => ({ value: n, label: n === '12' ? '12+' : n })), validation: { required: true }, sortOrder: 1 },
    { fieldKey: 'propertySubtype', inputType: 'select', label: 'Property type', options: ['office', 'retail', 'restaurant', 'takeaway', 'hotel', 'school', 'care_home', 'hospital', 'warehouse', 'industrial', 'worship', 'mixed', 'other'].map((v) => ({ value: v, label: v })), validation: { required: true }, sortOrder: 2 },
    { fieldKey: 'floors', inputType: 'select', label: 'Number of floors', options: ['1', '2', '3', '4', '5', '6+'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 3 },
  ] },
  { categoryCode: 'com_fire', code: 'com_fra', name: 'Commercial Fire Safety Risk Assessment', propertyType: PT.COMMERCIAL, pricingMode: PM.QUOTE_ONLY, displayOrder: 3, questions: [
    { fieldKey: 'propertySubtype', inputType: 'select', label: 'Property type', options: ['office', 'retail', 'restaurant', 'takeaway', 'hotel', 'school', 'care_home', 'hospital', 'warehouse', 'industrial', 'worship', 'mixed', 'other'].map((v) => ({ value: v, label: v })), validation: { required: true }, sortOrder: 1 },
    { fieldKey: 'floors', inputType: 'select', label: 'Number of floors', options: ['1', '2', '3', '4', '5', '6+'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 2 },
    { fieldKey: 'communalAreas', inputType: 'select', label: 'Number of communal areas', options: [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5+' }], validation: { required: true }, sortOrder: 3 },
    { fieldKey: 'additionalComments', inputType: 'textarea', label: 'Additional comments', validation: { required: false }, sortOrder: 4 },
  ] },
  { categoryCode: 'com_epc', code: 'cepc', name: 'Commercial EPC', propertyType: PT.COMMERCIAL, pricingMode: PM.STARTS_FROM, displayOrder: 1, metadata: { startsFromTierKey: 'cepc_starts_from' }, questions: [
    { fieldKey: 'propertySubtype', inputType: 'select', label: 'Property type', options: [{ value: 'retail', label: 'Retail / Shop' }, { value: 'office', label: 'Office' }, { value: 'restaurant', label: 'Restaurant, Café or Takeaway' }, { value: 'hotel', label: 'Hotel or Guest House' }, { value: 'warehouse', label: 'Warehouse or Industrial Unit' }, { value: 'other', label: 'Other' }], validation: { required: true }, sortOrder: 1 },
    { fieldKey: 'propertySubtypeOther', inputType: 'text', label: 'Other — please specify', validation: { required: true }, sortOrder: 2, conditionalLogic: { showWhen: { field: 'propertySubtype', equals: 'other' } } },
    { fieldKey: 'floorAreaCategory', inputType: 'select', label: 'Total floor area (SQM)', options: [{ value: 'up_to_25', label: 'Up to 25 SQM' }, { value: '26_50', label: '26 – 50 SQM' }, { value: '51_150', label: '51 – 150 SQM' }, { value: '151_250', label: '151 – 250 SQM' }, { value: '251_500', label: '251 – 500 SQM' }, { value: '501_750', label: '501 – 750 SQM' }, { value: '751_1000', label: '751 – 1,000 SQM' }, { value: '1001_plus', label: '1,001 SQM+' }], validation: { required: true }, sortOrder: 3 },
    { fieldKey: 'floorAreaSqm', inputType: 'number', label: 'Total floor area (SQM) — numeric', validation: { required: false }, sortOrder: 4 },
    { fieldKey: 'floors', inputType: 'select', label: 'Number of floors', options: ['1', '2', '3', '4', '5', '6+'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 5 },
    { fieldKey: 'existingEpc', inputType: 'radio', label: 'Is there a valid existing EPC?', options: [{ value: 'valid', label: 'Yes — currently valid' }, { value: 'expired', label: 'Yes — expired' }, { value: 'no', label: 'No' }, { value: 'unknown', label: 'Not known' }], validation: { required: true }, sortOrder: 6 },
    { fieldKey: 'existingEpcRating', inputType: 'select', label: 'Existing EPC rating (if known)', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'unknown'].map((v) => ({ value: v, label: v })), validation: { required: false }, sortOrder: 7, conditionalLogic: { showWhen: { field: 'existingEpc', in: ['valid', 'expired'] } } },
    { fieldKey: 'existingEpcLink', inputType: 'text', label: 'Existing EPC link', validation: { required: true }, sortOrder: 8, conditionalLogic: { showWhen: { field: 'existingEpc', in: ['valid', 'expired'] } } },
    { fieldKey: 'floorPlanAvailable', inputType: 'radio', label: 'Floor plan / Building drawing available?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'partial', label: 'Partial' }], validation: { required: true }, sortOrder: 9 },
    { fieldKey: 'additionalComments', inputType: 'textarea', label: 'Additional comments', validation: { required: false }, sortOrder: 10 },
  ] },
  { categoryCode: 'com_epc', code: 'com_floorplan', name: 'Commercial Floor Plan', propertyType: PT.COMMERCIAL, pricingMode: PM.QUOTE_ONLY, displayOrder: 2, questions: [
    { fieldKey: 'propertySubtype', inputType: 'select', label: 'Property type', options: [{ value: 'retail', label: 'Retail / Shop' }, { value: 'office', label: 'Office' }, { value: 'restaurant', label: 'Restaurant, Café or Takeaway' }, { value: 'hotel', label: 'Hotel or Guest House' }, { value: 'warehouse', label: 'Warehouse or Industrial Unit' }, { value: 'other', label: 'Other' }], validation: { required: true }, sortOrder: 1 },
    { fieldKey: 'floorAreaSqm', inputType: 'number', label: 'Total floor area (SQM)', validation: { required: true }, sortOrder: 2 },
    { fieldKey: 'floors', inputType: 'select', label: 'Number of floors', options: ['1', '2', '3'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 3 },
  ] },
  { categoryCode: 'com_epc', code: 'com_asbestos', name: 'Commercial Asbestos Survey', propertyType: PT.COMMERCIAL, pricingMode: PM.QUOTE_ONLY, displayOrder: 3, questions: [
    { fieldKey: 'propertySubtype', inputType: 'select', label: 'Property type', options: [{ value: 'retail', label: 'Retail / Shop' }, { value: 'office', label: 'Office' }, { value: 'restaurant', label: 'Restaurant, Café or Takeaway' }, { value: 'hotel', label: 'Hotel or Guest House' }, { value: 'warehouse', label: 'Warehouse or Industrial Unit' }, { value: 'other', label: 'Other' }], validation: { required: true }, sortOrder: 1 },
    { fieldKey: 'floorAreaSqm', inputType: 'number', label: 'Total floor area (SQM)', validation: { required: true }, sortOrder: 2 },
    { fieldKey: 'floors', inputType: 'select', label: 'Number of floors', options: ['1', '2', '3', '4', '5'].map((n) => ({ value: n, label: n })), validation: { required: true }, sortOrder: 3 },
  ] },

  // Installation
  { categoryCode: 'inst_electrical', code: 'inst_electrical', name: 'Electrical Installation & Repair', propertyType: PT.INSTALLATION, pricingMode: PM.STARTS_FROM, displayOrder: 0, metadata: { startsFromTierKey: 'inst_electrical_starts_from', startsFrom: 699.99 } },
  { categoryCode: 'inst_electrical', code: 'inst_fuse_board', name: 'Fuse Board Installation', propertyType: PT.INSTALLATION, pricingMode: PM.QUOTE_ONLY, displayOrder: 1, parentCode: 'inst_electrical', questions: [
    { fieldKey: 'subServices', inputType: 'checkbox_group', label: 'Select required', options: [{ value: '6_way', label: '6 Way Consumer Unit' }, { value: '6_10_way', label: '6-10 Way Consumer Unit' }, { value: '10_15_way', label: '10-15 Way Consumer Unit' }, { value: '15_20_way', label: '15-20 Way Consumer Unit' }, { value: 'skeleton', label: 'Skeleton Board' }], validation: { required: true }, sortOrder: 1 },
    { fieldKey: 'comments', inputType: 'textarea', label: 'What is needed', validation: { required: false }, sortOrder: 2 },
  ] },
  { categoryCode: 'inst_electrical', code: 'inst_socket', name: 'Socket Installation', propertyType: PT.INSTALLATION, pricingMode: PM.QUOTE_ONLY, displayOrder: 2, parentCode: 'inst_electrical', questions: [{ fieldKey: 'comments', inputType: 'textarea', label: 'What is needed', validation: { required: true }, sortOrder: 1 }] },
  { categoryCode: 'inst_electrical', code: 'inst_minor_works', name: 'Minor Works', propertyType: PT.INSTALLATION, pricingMode: PM.QUOTE_ONLY, displayOrder: 3, parentCode: 'inst_electrical', questions: [{ fieldKey: 'comments', inputType: 'textarea', label: 'What is needed', validation: { required: true }, sortOrder: 1 }] },
  { categoryCode: 'inst_electrical', code: 'inst_electrical_diagnostic', name: 'Electrical Diagnostics', propertyType: PT.INSTALLATION, pricingMode: PM.QUOTE_ONLY, displayOrder: 4, parentCode: 'inst_electrical', questions: [{ fieldKey: 'comments', inputType: 'textarea', label: 'What needs fixing', validation: { required: true }, sortOrder: 1 }] },
  { categoryCode: 'inst_gas', code: 'inst_new_boiler', name: 'New Boiler Installation', propertyType: PT.INSTALLATION, pricingMode: PM.STARTS_FROM, displayOrder: 1, metadata: { startsFromTierKey: 'inst_boiler_starts_from', startsFrom: 2999 }, questions: [{ fieldKey: 'requirements', inputType: 'textarea', label: 'Requirements', validation: { required: false }, sortOrder: 1 }, { fieldKey: 'details', inputType: 'checkbox_group', label: 'Details', options: [{ value: 'new_boiler', label: 'New Boiler installation' }], validation: { required: false }, sortOrder: 2 }] },
  { categoryCode: 'inst_gas', code: 'inst_cooker', name: 'Cooker Installation', propertyType: PT.INSTALLATION, pricingMode: PM.STARTS_FROM, displayOrder: 2, metadata: { startsFromTierKey: 'inst_cooker_starts_from', startsFrom: 220 }, questions: [
    { fieldKey: 'serviceType', inputType: 'checkbox_group', label: 'Service type', options: [{ value: 'new_cooker', label: 'New cooker install' }, { value: 'existing_only', label: 'Existing cooker install only' }], validation: { required: true }, sortOrder: 1 },
    { fieldKey: 'comments', inputType: 'textarea', label: 'Comments', validation: { required: false }, sortOrder: 2 },
  ] },
  { categoryCode: 'inst_gas', code: 'inst_gas_diagnostic', name: 'Gas Diagnostics', propertyType: PT.INSTALLATION, pricingMode: PM.QUOTE_ONLY, displayOrder: 3, questions: [{ fieldKey: 'comments', inputType: 'textarea', label: 'What needs fixing', validation: { required: true }, sortOrder: 1 }] },
  { categoryCode: 'inst_fire', code: 'inst_fire_alarm', name: 'Fire Alarm Install', propertyType: PT.INSTALLATION, pricingMode: PM.STARTS_FROM, displayOrder: 1, metadata: { startsFromTierKey: 'inst_fire_alarm_starts_from', startsFrom: 239.99, unit: 'per_alarm' } },
  { categoryCode: 'inst_fire', code: 'inst_fire_system', name: 'Fire System Install', propertyType: PT.INSTALLATION, pricingMode: PM.QUOTE_ONLY, displayOrder: 2, questions: [{ fieldKey: 'comments', inputType: 'textarea', label: 'Requirements', validation: { required: true }, sortOrder: 1 }] },
  { categoryCode: 'inst_fire', code: 'inst_fire_panel', name: 'Fire Panel Install with alarms & call points', propertyType: PT.INSTALLATION, pricingMode: PM.QUOTE_ONLY, displayOrder: 3, questions: [{ fieldKey: 'comments', inputType: 'textarea', label: 'Requirements', validation: { required: true }, sortOrder: 1 }] },
  { categoryCode: 'inst_fire', code: 'inst_emergency_light', name: 'Emergency Light Install', propertyType: PT.INSTALLATION, pricingMode: PM.STARTS_FROM, displayOrder: 4, metadata: { startsFromTierKey: 'inst_emergency_light_starts_from', startsFrom: 220, unit: 'per_light' } },
  { categoryCode: 'inst_fire', code: 'inst_co_heat', name: 'CO Alarm & Heat Alarm Install', propertyType: PT.INSTALLATION, pricingMode: PM.STARTS_FROM, displayOrder: 5, metadata: { startsFromTierKey: 'inst_co_heat_starts_from', startsFrom: 120 } },
];

const commercialTopQuestions = [
  { fieldKey: 'commercialPropertyType', inputType: 'radio', label: 'Property Type', options: [{ value: 'catering_hospitality', label: 'Catering & Hospitality — Restaurant / Café / Takeaway / Bar / Pub / Hotel Kitchen' }, { value: 'institutional_commercial', label: 'Institutional & Commercial — School / Care Home / Hospital / Office / Warehouse / Club / Other' }], validation: { required: true }, sortOrder: 0, scope: 'commercial_top' },
];

module.exports = {
  categories,
  pricingTiers,
  residentialBundles,
  services,
  commercialTopQuestions,
};
