export const BUSINESS_UNIT_NAMES = [
  'MANAGEMENT',
  'HCAM',
  'TGLT',
  'SUPPORT OCE',
  'HC SOLUTION I',
  'HC SOLUTION II',
  'HC SOLUTION III',
  'CUSTOMER',
];

export function normalizeBusinessUnitName(value) {
  return (value || '').toString().trim().replace(/\s+/g, ' ').toUpperCase();
}

export function isAllowedBusinessUnit(value) {
  return BUSINESS_UNIT_NAMES.includes(normalizeBusinessUnitName(value));
}

export function sortAllowedBusinessUnits(units = []) {
  return units
    .map(unit => ({ ...unit, name: normalizeBusinessUnitName(unit.name) }))
    .filter(unit => isAllowedBusinessUnit(unit.name))
    .sort((a, b) => BUSINESS_UNIT_NAMES.indexOf(a.name) - BUSINESS_UNIT_NAMES.indexOf(b.name));
}

export function buildBusinessUnitOptions(units = []) {
  const byName = new Map(sortAllowedBusinessUnits(units).map(unit => [unit.name, unit]));
  return BUSINESS_UNIT_NAMES.map(name => ({
    name,
    id: byName.get(name)?.id || '',
    configured: Boolean(byName.get(name)?.id),
  }));
}
