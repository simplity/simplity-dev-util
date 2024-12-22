import {
  Value,
  ValueSchema,
  ValueValidationFn,
  ValueValidationResult,
} from 'simplity-types';
export const DEFAULT_MAX_CHARS = 1000;
export const DEFAULT_DAYS_RANGE = 365000;
export const DEFAULT_MAX_NUMBER = Number.MAX_SAFE_INTEGER;
export const DEFAULT_NBR_DECIMALS = 2;

const DEFAULT_FACTOR = 10 ** DEFAULT_NBR_DECIMALS;
const NUMBER_REGEX = /^-?\d*\.?\d*$/;
const DATE_REGEX = /^\d\d\d\d-\d\d-\d\d$/;
const TIME_REGEX = /^T\d\d:\d\d:\d\d\.\d\d\dZ$/;

const TEXT_ERROR: ValueValidationResult = {
  messages: [{ alertType: 'error', messageId: '_invalidText' }],
};
const BOOL_ERROR: ValueValidationResult = {
  messages: [{ alertType: 'error', messageId: '_invalidBoolean' }],
};
const NUMBER_ERROR: ValueValidationResult = {
  messages: [{ alertType: 'error', messageId: '_invalidNumber' }],
};
const DATE_ERROR: ValueValidationResult = {
  messages: [{ alertType: 'error', messageId: '_invalidDate' }],
};
const STAMP_ERROR: ValueValidationResult = {
  messages: [{ alertType: 'error', messageId: '_invalidTimestamp' }],
};

/**
 * type definitions internally used for improving code quality
 */
type SchemaForText = {
  minLength: number;
  maxLength: number;
  regex?: RegExp;
};

type SchemaForDate = {
  minValue: number;
  maxValue: number;
};

type SchemaForNumber = SchemaForDate & {
  factor: number;
};

/**
 * creates a function that can be used to validate a value against the supplied value-schema
 * @param schema schema json. Typically entered as met-date by designers, or generated by utilities
 * @returns validation function
 */
export function createValidationFn(schema: ValueSchema): ValueValidationFn {
  /**
   * all the parameters required for validation
   */

  let s = schema as SchemaForText;
  let minLength = s.minLength || 0;
  let maxLength = s.maxLength || DEFAULT_MAX_CHARS;
  let regex = s.regex ? new RegExp(s.regex) : undefined;
  let minValue = 0; //we deal with business data, and hence negative numbers not allowed by default
  let maxValue = DEFAULT_MAX_NUMBER;

  switch (schema.valueType) {
    case 'text':
      return createTextFn({
        maxLength,
        minLength,
        regex,
      });

    case 'boolean':
      return validateBoolean;

    case 'integer':
      if (schema.minValue !== undefined) {
        minValue = Math.round(schema.minValue);
      }

      if (schema.maxValue !== undefined) {
        maxValue = Math.round(schema.maxValue);
      }

      return createNumberFn({
        factor: 1,
        maxValue,
        minValue,
      });

    case 'decimal':
      let factor = DEFAULT_FACTOR;
      let nbr = schema.nbrDecimalPlaces && schema.nbrDecimalPlaces;
      if (nbr && nbr > 0) {
        nbr = Math.round(nbr);
        factor = 10 ** nbr;
      }

      if (schema.minValue !== undefined) {
        minValue = roundIt(schema.minValue, factor);
      }

      if (schema.maxValue !== undefined) {
        maxValue = roundIt(schema.maxValue, factor);
      }
      return createNumberFn({
        factor,
        maxValue,
        minValue,
      });

    case 'date':
    case 'timestamp':
      if (schema.maxPastDays !== undefined) {
        minValue = -Math.round(schema.maxPastDays);
      } else {
        minValue = -DEFAULT_DAYS_RANGE;
      }

      if (schema.maxFutureDays !== undefined) {
        maxValue = Math.round(schema.maxFutureDays);
      } else {
        maxValue = DEFAULT_DAYS_RANGE;
      }

      if (schema.valueType === 'date') {
        return createDateFn({
          maxValue,
          minValue,
        });
      }
      return createTimestampFn({
        maxValue,
        minValue,
      });
    default:
      throw new Error(
        `${(schema as any).valueType} is not a valid value type. Can not process this value-schema`
      );
  }
}

/*
 * createXxxFn functions are  designed to minimize the scope of teh closure around the returned function
 */
function createTextFn(schema: SchemaForText): ValueValidationFn {
  return (value: string) => {
    return validateString(schema, value);
  };
}

function createNumberFn(schema: SchemaForNumber): ValueValidationFn {
  return (value: string) => {
    return validateNumber(schema, value);
  };
}

function createDateFn(schema: SchemaForDate): ValueValidationFn {
  return (value: string) => {
    return validateDate(schema, value);
  };
}

function createTimestampFn(schema: SchemaForDate): ValueValidationFn {
  return (value: string) => {
    return validateTimestamp(schema, value);
  };
}

/*
 * run-time validation functions that use our internal schema parameters
 */
function validateString(
  schema: SchemaForText,
  value: string
): ValueValidationResult {
  //playing it safe with non-string argument
  if (value === undefined || value === null || Number.isNaN(value)) {
    return TEXT_ERROR;
  }

  const s = value.toString().trim();
  const len = s.length;
  if (len < schema.minLength!) {
    return {
      messages: [
        {
          alertType: 'error',
          messageId: '_minLength',
          params: [schema.minLength + ''],
        },
      ],
    };
  }

  if (len > schema.maxLength!) {
    return {
      messages: [
        {
          alertType: 'error',
          messageId: '_maxLength',
          params: [schema.maxLength + ''],
        },
      ],
    };
  }

  if (schema.regex && schema.regex.test(s) === false) {
    return TEXT_ERROR;
  }

  return { value: s };
}

function validateNumber(
  schema: SchemaForNumber,
  value: string
): ValueValidationResult {
  //playing it safe with non-string argument
  const str = (value + '').trim();
  if (!NUMBER_REGEX.test(str)) {
    return NUMBER_ERROR;
  }

  let nbr = Number.parseFloat(str);
  if (Number.isNaN(nbr)) {
    return NUMBER_ERROR;
  }

  //make it an integer or decimal to the right number of decimal places
  nbr = Math.round(nbr * schema.factor) / schema.factor;

  if (nbr < schema.minValue) {
    return {
      messages: [
        {
          alertType: 'error',
          messageId: '_minValue',
          params: [schema.minValue + ''],
        },
      ],
    };
  }

  if (nbr > schema.maxValue) {
    return {
      messages: [
        {
          alertType: 'error',
          messageId: '_maxValue',
          params: [schema.maxValue + ''],
        },
      ],
    };
  }

  return { value: nbr };
}

/**
 * very special case for boolean because of TS/JS issues:
 *
 * @param value
 * @returns
 */
function validateBoolean(value: string): ValueValidationResult {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return { value: false };
  }

  //playing it safe with non-string argument
  const text = (value + '').trim().toLowerCase();
  if (text === 'true' || text == '1') {
    return { value: true };
  }

  if (text === 'false' || text == '0') {
    return { value: false };
  }

  return BOOL_ERROR;
}

function validateDate(
  schema: SchemaForDate,
  value: Value
): ValueValidationResult {
  const str = (value + '').trim();
  if (!DATE_REGEX.test(str)) {
    return DATE_ERROR;
  }
  const yyyy = Number.parseInt(str.substring(0, 4), 10);
  const mm = Number.parseInt(str.substring(5, 7), 10) - 1; //month index
  const dd = Number.parseInt(str.substring(8, 10), 10);
  const dateMs = Date.UTC(yyyy, mm, dd);
  const date = new Date(dateMs);

  if (
    dd !== date.getDate() ||
    mm !== date.getMonth() ||
    yyyy !== date.getFullYear()
  ) {
    return DATE_ERROR;
  }

  //get local date
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMon = now.getMonth();
  const nowDate = now.getDate();

  //Date constructor allows us to just add days to get the desired date object
  let refMs = Date.UTC(nowYear, nowMon, nowDate + schema.minValue);
  if (dateMs < refMs) {
    return {
      messages: [
        {
          alertType: 'error',
          messageId: '_earliestDate',
          params: [new Date(refMs).toISOString().substring(0, 10)],
        },
      ],
    };
  }

  refMs = Date.UTC(nowYear, nowMon, nowDate + schema.maxValue);
  if (dateMs > refMs) {
    return {
      messages: [
        {
          alertType: 'error',
          messageId: '_latestDate',
          params: [new Date(refMs).toISOString().substring(0, 10)],
        },
      ],
    };
  }
  // note that we use date-string as the value for date fields
  return { value: str };
}

function validateTimestamp(
  schema: SchemaForDate,
  value: Value
): ValueValidationResult {
  const valueStr = (value + '').trim();
  if (valueStr.length !== 24) {
    return STAMP_ERROR;
  }

  let str = valueStr.substring(0, 10);
  const res = validateDate(schema, str);
  const msg = res.messages && res.messages[0];
  if (msg) {
    if (msg.params) {
      //max-min error
      return res;
    }
    return STAMP_ERROR;
  }

  str = valueStr.substring(10, 24);
  if (!TIME_REGEX.test(str)) {
    return STAMP_ERROR;
  }

  const hrs = Number.parseInt(str.substring(1, 3), 10);
  const mns = Number.parseInt(str.substring(4, 6), 10);
  const secs = Number.parseFloat(str.substring(7, 13));
  if (
    hrs > 24 ||
    mns > 59 ||
    secs > 59 || //we will not validate leap second!!
    (hrs === 24 && (mns > 0 || secs > 0))
  ) {
    return STAMP_ERROR;
  }

  return { value: valueStr };
}

function roundIt(n: number, factor: number): number {
  return Math.round(n * factor) / factor;
}
