const DEFAULT_MAX_CHARS = 1000;
const DEFAULT_DAYS_RANGE = 365000;
const DEFAULT_MAX_NUMBER = Number.MAX_SAFE_INTEGER;
const DEFAULT_NBR_DECIMALS = 2;
const INITTEXT = `/**
 * ****** This is a generated file. Should not be edited manually ******
 */
import {
  validateBoolean,
  validateDate,
  validateNumber,
  validateText,
  validateTimestamp,
} from 'simplity-client';
import { ValueValidationFn } from 'simplity-types';

export const validationFunctions: Record<string, ValueValidationFn> = `;
const PREFIX = `
  `;
const START = `: (param: { value: string }) => {
    `;
const END = `
  },`;
/**
 * Generates validation functions for the given schemas.
 * @param schemas The schemas to generate validation functions for.
 * @returns A string containing the generated validation functions. this can be written out to a file with ".ts" extension.
 */
export function generateValidationFns(schemas) {
    const t = [INITTEXT];
    for (const [name, schema] of Object.entries(schemas)) {
        t.push(PREFIX);
        t.push(name);
        t.push(START);
        switch (schema.valueType) {
            case 'boolean':
                t.push(doBoolean(schema));
                break;
            case 'date':
                t.push(doDate(schema));
                break;
            case 'integer':
                t.push(doInt(schema));
                break;
            case 'decimal':
                t.push(doDecimal(schema));
                break;
            case 'text':
                t.push(doText(schema));
                break;
            case 'timestamp':
                t.push(doTimestamp(schema));
                break;
        }
        t.push(END);
    }
    t.push('};\n');
    return t.join('\n');
}
function doText(schema) {
    const min = schema.minLength ? schema.minLength : 0;
    const max = schema.maxLength ? schema.maxLength : DEFAULT_MAX_CHARS;
    const regex = schema.regex ? `, regex: new RegExp(schema.regex)` : '';
    return `return validateText(
      { minLength: ${min}, maxLength: ${max}${regex} },
      param.value
    );`;
}
function doBoolean(schema) {
    return `return validateBoolean({}, param.value);`;
}
function doInt(schema) {
    const min = schema.minValue ? schema.minValue : 0;
    const max = schema.maxValue ? schema.maxValue : DEFAULT_MAX_NUMBER;
    return `return validateNumber(
      { minValue: ${min}, maxValue: ${max}, factor:1 },
      param.value
    );`;
}
function doDecimal(schema) {
    const min = schema.minValue ? schema.minValue : 0;
    const max = schema.maxValue ? schema.maxValue : DEFAULT_MAX_NUMBER;
    const n = schema.nbrDecimalPlaces
        ? schema.nbrDecimalPlaces
        : DEFAULT_NBR_DECIMALS;
    const factor = 10 ** Math.round(n);
    return `return validateNumber(
      { minValue: ${min}, maxValue: ${max}, factor: ${factor} },
      param.value
    );`;
}
function doTimestamp(schema) {
    const min = schema.maxPastDays ? schema.maxPastDays : DEFAULT_DAYS_RANGE;
    const max = schema.maxFutureDays ? schema.maxFutureDays : DEFAULT_DAYS_RANGE;
    return `return validateTimestamp({ minValue: ${min}, maxValue: ${max} }, param.value);`;
}
function doDate(schema) {
    const maxValue = schema.maxFutureDays
        ? schema.maxFutureDays
        : DEFAULT_DAYS_RANGE;
    const minValue = schema.maxPastDays ? schema.maxPastDays : DEFAULT_DAYS_RANGE;
    return `return validateDate({ minValue: ${minValue}, maxValue: ${maxValue} }, param.value);`;
}
//# sourceMappingURL=generateValidationFns.js.map