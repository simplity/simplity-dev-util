import { Value, ValueType, ValueSchema, TextSchema } from 'simplity-types';
import {
  DEFAULT_MAX_CHARS,
  DEFAULT_MAX_NUMBER,
  DEFAULT_DAYS_RANGE,
  createValidationFn,
} from './validation';
import { describe, expect, it } from '@jest/globals';

type TestSets = { [valueType in ValueType]: TestCases[] };
type OkTest = {
  value: any;
  parsedValue?: Value;
};

type NotOkTest = {
  value: any;
  errorId: string;
  params?: string[];
};

type TestCases = {
  description: string;
  schema: ValueSchema;
  okTests: OkTest[];
  notOkTests: NotOkTest[];
};

let b = '';
for (let i = 0; i < DEFAULT_MAX_CHARS; i++) {
  b += 'a';
}
const LONG_STR = b;
const LONG_STR_PLUS_ONE = b + '1';

//dates can not be hard-coded for testing. They are relative to now()
const now = new Date();
const nowYear = now.getFullYear();
const nowMon = now.getMonth();
const nowDate = now.getDate();

//get UTC date with this date and 0 time
const today = new Date(Date.UTC(nowYear, nowMon, nowDate, 0, 0, 0, 0));
const todayPlus10 = new Date(
  Date.UTC(nowYear, nowMon, nowDate + 10, 0, 0, 0, 0)
);

const todayMinus20 = new Date(
  Date.UTC(nowYear, nowMon, nowDate - 20, 0, 0, 0, 0)
);

const maxDate = new Date(
  Date.UTC(nowYear, nowMon, nowDate + DEFAULT_DAYS_RANGE, 0, 0, 0, 0)
);

const minDate = new Date(
  Date.UTC(nowYear, nowMon, nowDate - DEFAULT_DAYS_RANGE, 0, 0, 0, 0)
);

const minDateMinus1 = new Date(
  Date.UTC(nowYear, nowMon, nowDate - DEFAULT_DAYS_RANGE - 1)
);

const maxDatePlus1 = new Date(
  Date.UTC(nowYear, nowMon, nowDate + DEFAULT_DAYS_RANGE + 1)
);

const NOW = today.toISOString();
const NOW_PLUS_10 = todayPlus10.toISOString();
const NOW_MINUS_20 = todayMinus20.toISOString();
const MAX_TIMESTAMP = maxDate.toISOString();
const MIN_TIMESTAMP = minDate.toISOString();
const MAX_TIMESTAMP_PLUS1 = maxDatePlus1.toISOString();
const MIN_TIMESTAMP_MINUS1 = minDateMinus1.toISOString();

const TODAY = NOW.substring(0, 10);
const TODAY_PLUS_10 = NOW_PLUS_10.substring(0, 10);
const TODAY_MINUS_20 = NOW_MINUS_20.substring(0, 10);
const MAX_DATE = MAX_TIMESTAMP.substring(0, 10);
const MIN_DATE = MIN_TIMESTAMP.substring(0, 10);
const MAX_DATE_PLUS1 = MAX_TIMESTAMP_PLUS1.substring(0, 10);
const MIN_DATE_MINUS1 = MIN_TIMESTAMP_MINUS1.substring(0, 10);

const ZERO_TIME = 'T00:00:00.000Z';
const VALID_TIME = 'T21:34:52.895Z';

//error codes
const TEXT_ERR = '_invalidText';
const NUMBER_ERR = '_invalidNumber';
const BOOL_ERR = '_invalidBoolean';
const DATE_ERR = '_invalidDate';
const STAMP_ERR = '_invalidTimestamp';
const MIN_LEN_ERR = '_minLength';
const MAX_LEN_ERR = '_maxLength';
const MIN_VAL_ERR = '_minValue';
const MAX_VAL_ERROR = '_maxValue';
const EARLY_ERROR = '_earliestDate';
const LATE_ERROR = '_latestDate';

//value Types
const TEXT = 'text';
const INT = 'integer';
const DECIMAL = 'decimal';
const BOOL = 'boolean';
const DATE = 'date';
const STAMP = 'timestamp';

export const testSets: TestSets = {
  boolean: [
    {
      description: 'default boolean schema',
      schema: {
        name: 'bool',
        valueType: BOOL,
      },
      notOkTests: [
        {
          value: -1,
          errorId: BOOL_ERR,
        },
        {
          value: 100,
          errorId: BOOL_ERR,
        },
        {
          value: 't rue',
          errorId: BOOL_ERR,
        },
        {
          value: 'right',
          errorId: BOOL_ERR,
        },
        {
          value: 'wrong',
          errorId: BOOL_ERR,
        },
        {
          value: 'a long text that is certainly not a boolean',
          errorId: BOOL_ERR,
        },
        { value: 'ಸುಳ್ಳು', errorId: BOOL_ERR },
        { value: 'ನಿಜ', errorId: BOOL_ERR },
      ],
      okTests: [
        {
          value: undefined,
          parsedValue: false,
        },
        {
          value: NaN,
          parsedValue: false,
        },
        {
          value: null,
          parsedValue: false,
        },
        { value: true },
        { value: false },
        {
          value: 'true',
          parsedValue: true,
        },
        {
          value: 'false',
          parsedValue: false,
        },
        {
          value: ' true',
          parsedValue: true,
        },
        {
          value: 'true ',
          parsedValue: true,
        },
        {
          value: '\t\n false \t  ',
          parsedValue: false,
        },
        {
          value: '1',
          parsedValue: true,
        },
        {
          value: '0',
          parsedValue: false,
        },
        {
          value: 1,
          parsedValue: true,
        },
        {
          value: 0,
          parsedValue: false,
        },
      ],
    },
    {
      description:
        'boolean with max/min length. expect the lengths to be ignored',
      schema: {
        valueType: BOOL,
        name: 'name',
        //minLength: 10,
        //maxLength: 100,
      },
      okTests: [
        {
          value: 1,
          parsedValue: true,
        },
        {
          value: 0,
          parsedValue: false,
        },
      ],
      notOkTests: [],
    },
  ],
  text: [
    {
      description: `default text-type. expect min-length as 0 and max length as ${DEFAULT_MAX_CHARS}`,
      schema: {
        name: 'name',
        valueType: TEXT,
      },
      okTests: [
        { value: '' },
        { value: 'a' },
        { value: '!@#$%^&*((()(*^%%GHHHJHBhgtyh' },
        { value: LONG_STR },
        { value: true, parsedValue: 'true' },
        { value: false, parsedValue: 'false' },
        { value: 123, parsedValue: '123' },
        { value: 1.456, parsedValue: '1.456' },
        { value: 0, parsedValue: '0' },
      ],
      notOkTests: [
        {
          value: LONG_STR_PLUS_ONE,
          errorId: MAX_LEN_ERR,
          params: [DEFAULT_MAX_CHARS + ''],
        },
      ],
    },
    {
      description: 'min 4 and max 9 characters with no regex',
      schema: {
        name: 'name',
        valueType: TEXT,
        minLength: 4,
        maxLength: 9,
      },
      okTests: [
        { value: 1234, parsedValue: '1234' },
        { value: 12345, parsedValue: '12345' },
        { value: 12345, parsedValue: '12345' },
        { value: 1.23456, parsedValue: '1.23456' },
        { value: '1a3B.$%' },
        { value: 'sev e n' },
        { value: 'a\n\t b', parsedValue: 'a\n\t b' },
        { value: 'ಭಾರತ', parsedValue: 'ಭಾರತ' }, //this unicode results in 5 chars!!
        { value: true, parsedValue: 'true' },
        { value: false, parsedValue: 'false' },
        { value: '   ~!@tyu7  \t ', parsedValue: '~!@tyu7' },
        { value: '   true', parsedValue: 'true' },
      ],
      notOkTests: [
        { value: undefined, errorId: TEXT_ERR },
        { value: NaN, errorId: TEXT_ERR },
        { value: null, errorId: TEXT_ERR },
        { value: [], errorId: MIN_LEN_ERR, params: ['4'] },
        { value: {}, errorId: MAX_LEN_ERR, params: ['9'] },
        {
          value: 1234567890,
          errorId: MAX_LEN_ERR,
          params: ['9'],
        },
        {
          value: '00001234567',
          errorId: MAX_LEN_ERR,
          params: ['9'],
        },
        {
          value: 'a                     b',
          errorId: MAX_LEN_ERR,
          params: ['9'],
        },
        {
          value: '',
          errorId: MIN_LEN_ERR,
          params: ['4'],
        },
        {
          value: '  ab ',
          errorId: MIN_LEN_ERR,
          params: ['4'],
        },
        {
          value: 'ಭಾರ',
          errorId: MIN_LEN_ERR,
          params: ['4'],
        },
        {
          value: 'ಭಾರತಮಾತೆಯ ಮಡಿಲಲ್ಲಿ ',
          errorId: MAX_LEN_ERR,
          params: ['9'],
        },
      ],
    },
    {
      description: 'PAN of type xxxxxnnnnx',
      schema: {
        name: 'name',
        valueType: TEXT,
        regex: '^[a-z]{5}[0-9]{4}[a-zA-Z]$', //this requires exactly 10 characters
        maxLength: 15, //deliberately given more to test the behavior
        minLength: 5, //likewise min length
      } as TextSchema,
      okTests: [{ value: 'abcde1234z' }, { value: 'actab3047K' }],
      notOkTests: [
        {
          value: 'a',
          errorId: MIN_LEN_ERR,
          params: ['5'],
        },
        {
          value: 'abcde1234zzzzzzgsdhgskdhgas dasasgakshg s',
          errorId: MAX_LEN_ERR,
          params: ['15'],
        },
        {
          value: 'abcde12',
          errorId: TEXT_ERR,
        },
        {
          value: '0123456789',
          errorId: TEXT_ERR,
        },
        {
          value: 'abcde1234zabc',
          errorId: TEXT_ERR,
        },
      ],
    },
    {
      description:
        'schema has max less than min, hence no string would be valid',
      schema: { valueType: TEXT, name: 'name', minLength: 2, maxLength: 1 },
      okTests: [],
      notOkTests: [
        {
          value: 'x',
          errorId: MIN_LEN_ERR,
          params: ['2'],
        },
        {
          value: 'xx',
          errorId: MAX_LEN_ERR,
          params: ['1'],
        },
      ],
    },
  ],
  integer: [
    {
      //default minValue is 0, and max is SAFE_INTEGER
      description: 'default integer',
      schema: {
        name: 'name',
        valueType: INT,
      },
      okTests: [
        { value: 0 },
        { value: 0.01, parsedValue: 0 },
        { value: '8.9', parsedValue: 9 },
      ],
      notOkTests: [
        { value: undefined, errorId: NUMBER_ERR },
        { value: null, errorId: NUMBER_ERR },
        { value: NaN, errorId: NUMBER_ERR },
        { value: '', errorId: NUMBER_ERR },
        { value: 'a12', errorId: NUMBER_ERR },
        { value: '.1.', errorId: NUMBER_ERR },
        {
          value: -1,
          errorId: MIN_VAL_ERR,
          params: ['0'],
        },
        {
          value: -99999999999,
          errorId: MIN_VAL_ERR,
          params: ['0'],
        },
        {
          value: '9999999999999999999999999999999999999999999999999',
          errorId: MAX_VAL_ERROR,
          params: [DEFAULT_MAX_NUMBER + ''],
        },
      ],
    },
    {
      description: 'min 18 and max 150',
      schema: {
        name: 'name',
        valueType: INT,
        minValue: 18,
        maxValue: 150,
      },
      okTests: [
        { value: 18 },
        { value: 150 },
        { value: '000150.01', parsedValue: 150 },
        { value: 17.612, parsedValue: 18 },
        { value: 150.455, parsedValue: 150 },
      ],
      notOkTests: [
        {
          value: 17,
          errorId: MIN_VAL_ERR,
          params: ['18'],
        },
      ],
    },
    {
      description: 'testing with -ve min and +ve max with decimal places',
      schema: {
        name: 'name',
        valueType: INT,
        minValue: -10.192, //this is to be rounded to -10
        maxValue: 9.611, ///this is to be rounded to 10
      },
      okTests: [
        { value: '-10.3', parsedValue: -10 },
        { value: -9 },
        { value: 10.4454, parsedValue: 10 },
        { value: 9 },
        { value: 0 },
      ],
      notOkTests: [
        {
          value: -10.6,
          errorId: MIN_VAL_ERR,
          params: ['-10'],
        },
        { value: -11, errorId: MIN_VAL_ERR, params: ['-10'] },
        { value: -12, errorId: MIN_VAL_ERR, params: ['-10'] },
        {
          value: -99999999999999,
          errorId: MIN_VAL_ERR,
          params: ['-10'],
        },
        { value: 10.6, errorId: MAX_VAL_ERROR, params: ['10'] },
        { value: 12, errorId: MAX_VAL_ERROR, params: ['10'] },
        {
          value: 8888888888888,
          errorId: MAX_VAL_ERROR,
          params: ['10'],
        },
      ],
    },
    {
      description: 'min and max are -ve. nbrDecimal places is to be ignored',
      schema: {
        name: 'name',
        valueType: INT,
        minValue: -100,
        maxValue: -10,
        //nbrDecimalPlaces: 10, //to be ignored, as this is an integer
      },
      okTests: [
        { value: '-100', parsedValue: -100 },
        { value: -99 },
        { value: -10 },
        { value: -11 },
      ],
      notOkTests: [
        {
          value: -101,
          errorId: MIN_VAL_ERR,
          params: ['-100'],
        },
        {
          value: -102,
          errorId: MIN_VAL_ERR,
          params: ['-100'],
        },
        {
          value: -99999999999999,
          errorId: MIN_VAL_ERR,
          params: ['-100'],
        },
        { value: -9, errorId: MAX_VAL_ERROR, params: ['-10'] },
        { value: -8, errorId: MAX_VAL_ERROR, params: ['-10'] },
        { value: 0, errorId: MAX_VAL_ERROR, params: ['-10'] },
      ],
    },
    {
      description: 'min is more than max. no valid numbers',
      schema: { name: 'name', valueType: INT, minValue: 10, maxValue: 1 },
      okTests: [],
      notOkTests: [
        { value: -11, errorId: MIN_VAL_ERR, params: ['10'] },
        { value: 0, errorId: MIN_VAL_ERR, params: ['10'] },
        {
          value: 9,
          errorId: MIN_VAL_ERR,
          params: ['10'],
        },
        { value: 11, errorId: MAX_VAL_ERROR, params: ['1'] },
        { value: 12, errorId: MAX_VAL_ERROR, params: ['1'] },
        {
          value: 8888888888888,
          errorId: MAX_VAL_ERROR,
          params: ['1'],
        },
      ],
    },
  ],
  decimal: [
    //default decimal is similar to default integer with 2 decimal places
    {
      description: 'default decimal',
      schema: {
        name: 'name',
        valueType: DECIMAL,
      },
      okTests: [
        { value: 0 },
        { value: '0', parsedValue: 0 },
        { value: 0.01 },
        { value: '8.98', parsedValue: 8.98 },
        { value: '8.9785432', parsedValue: 8.98 },
        { value: 0.001, parsedValue: 0 },
        { value: '01.011', parsedValue: 1.01 },
      ],
      notOkTests: [
        { value: undefined, errorId: NUMBER_ERR },
        { value: null, errorId: NUMBER_ERR },
        { value: NaN, errorId: NUMBER_ERR },
        { value: '', errorId: NUMBER_ERR },
        { value: 'a12', errorId: NUMBER_ERR },
        { value: '.1.', errorId: NUMBER_ERR },
        {
          value: -1,
          errorId: MIN_VAL_ERR,
          params: ['0'],
        },
        {
          value: -99999999999,
          errorId: MIN_VAL_ERR,
          params: ['0'],
        },
        {
          value: '9999999999999999999999999999999999999999999999999',
          errorId: MAX_VAL_ERROR,
          params: [DEFAULT_MAX_NUMBER + ''],
        },
      ],
    },
    {
      description: 'decimal with +ve min/max values',
      schema: {
        name: 'name',
        valueType: DECIMAL,
        nbrDecimalPlaces: 4,
        minValue: 18,
        maxValue: 150,
      },
      okTests: [
        { value: 17.99999, parsedValue: 18 },
        { value: 18.000111, parsedValue: 18.0001 },
        { value: 150.00000999, parsedValue: 150 },
        { value: '000140.001009099', parsedValue: 140.001 },
      ],
      notOkTests: [
        {
          value: '150.0009123',
          errorId: MAX_VAL_ERROR,
          params: ['150'],
        },
        {
          value: 151,
          errorId: MAX_VAL_ERROR,
          params: ['150'],
        },
        {
          value: 11111111111111.1111,
          errorId: MAX_VAL_ERROR,
          params: ['150'],
        },
        {
          value: 17.9999012,
          errorId: MIN_VAL_ERR,
          params: ['18'],
        },
        {
          value: 0,
          errorId: MIN_VAL_ERR,
          params: ['18'],
        },
        {
          value: -1111,
          errorId: MIN_VAL_ERR,
          params: ['18'],
        },
      ],
    },
    {
      description: 'min is -ve max is +ve.',
      schema: {
        name: 'name',
        valueType: DECIMAL,
        nbrDecimalPlaces: -10, //must be reset to default of 2
        minValue: -10.229, //expect this to be rounded to 10.23
        maxValue: 10.35198, //expect this to be rounded to 10.35
      },
      okTests: [
        { value: '-10.2345', parsedValue: -10.23 },
        { value: -9.9901234, parsedValue: -9.99 },
        { value: 10.35456, parsedValue: 10.35 },
        { value: 9.99900999, parsedValue: 10 },
        { value: 0 },
      ],
      notOkTests: [
        {
          value: -10.239,
          errorId: MIN_VAL_ERR,
          params: ['-10.23'],
        },
        {
          value: -12,
          errorId: MIN_VAL_ERR,
          params: ['-10.23'],
        },
        {
          value: -99999999999999,
          errorId: MIN_VAL_ERR,
          params: ['-10.23'],
        },
        {
          value: 10.35645,
          errorId: MAX_VAL_ERROR,
          params: ['10.35'],
        },
        {
          value: 12,
          errorId: MAX_VAL_ERROR,
          params: ['10.35'],
        },
        {
          value: 8888888888888,
          errorId: MAX_VAL_ERROR,
          params: ['10.35'],
        },
      ],
    },
    {
      description: 'min and max are -ve',
      schema: {
        name: 'name',
        valueType: DECIMAL,
        minValue: -100.11119, //to be rounded to -100.11
        maxValue: -10,
      },
      okTests: [
        { value: '-100.1112122', parsedValue: -100.11 },
        { value: -99.7632, parsedValue: -99.76 },
        { value: -10.0000456, parsedValue: -10 },
        { value: -11.123456, parsedValue: -11.12 },
      ],
      notOkTests: [
        {
          value: -100.119266,
          errorId: MIN_VAL_ERR,
          params: ['-100.11'],
        },
        {
          value: -102,
          errorId: MIN_VAL_ERR,
          params: ['-100.11'],
        },
        {
          value: -99999999999999,
          errorId: MIN_VAL_ERR,
          params: ['-100.11'],
        },
        {
          value: -9.990912,
          errorId: MAX_VAL_ERROR,
          params: ['-10'],
        },
        { value: -8, errorId: MAX_VAL_ERROR, params: ['-10'] },
        { value: 0, errorId: MAX_VAL_ERROR, params: ['-10'] },
      ],
    },
  ],
  date: [
    {
      description: 'default date',
      schema: {
        name: 'name',
        valueType: DATE,
      },
      okTests: [
        { value: TODAY },
        //hoping that this program does not survive another DEFAULT_MAX_RANGE days :-)
        { value: '2023-08-24' },
        { value: '2004-02-29' },
        { value: '2000-02-29' },
        { value: TODAY_MINUS_20 },
        { value: TODAY_PLUS_10 },
        { value: MAX_DATE },
        { value: MIN_DATE },
      ],
      notOkTests: [
        { value: undefined, errorId: DATE_ERR },
        { value: null, errorId: DATE_ERR },
        { value: NaN, errorId: DATE_ERR },
        { value: '', errorId: DATE_ERR },
        { value: 'abcd', errorId: DATE_ERR },
        { value: 2007, errorId: DATE_ERR },
        { value: true, errorId: DATE_ERR },
        { value: '2000/12/20', errorId: DATE_ERR },
        { value: '12/20/2000', errorId: DATE_ERR },
        { value: '20/12/2000', errorId: DATE_ERR },
        { value: '2000.12.20', errorId: DATE_ERR },
        { value: '12-20-2000', errorId: DATE_ERR },
        { value: '20-12-2000', errorId: DATE_ERR },
        { value: '2100-02-29', errorId: DATE_ERR },
        { value: '2111-13-29', errorId: DATE_ERR },
        { value: '1456-02-30', errorId: DATE_ERR },
        { value: '2132-06-31', errorId: DATE_ERR },
        { value: '1634-07-32', errorId: DATE_ERR },
        {
          value: MAX_DATE_PLUS1,
          errorId: LATE_ERROR,
          params: [MAX_DATE],
        },
        {
          value: MIN_DATE_MINUS1,
          errorId: EARLY_ERROR,
          params: [MIN_DATE],
        },
      ],
    },
    {
      description: 'dates in the future, including today',
      schema: {
        name: 'name',
        valueType: DATE,
        maxPastDays: 0,
        maxFutureDays: 10,
      },
      okTests: [{ value: TODAY }, { value: TODAY_PLUS_10 }],
      notOkTests: [
        {
          value: MAX_DATE,
          errorId: LATE_ERROR,
          params: [TODAY_PLUS_10],
        },
        {
          value: MIN_DATE,
          errorId: EARLY_ERROR,
          params: [TODAY],
        },
        {
          value: TODAY_MINUS_20,
          errorId: EARLY_ERROR,
          params: [TODAY],
        },
      ],
    },
    {
      description: 'dates in the past, including today',
      schema: {
        name: 'name',
        valueType: DATE,
        maxPastDays: 20,
        maxFutureDays: 0,
      },
      okTests: [{ value: TODAY }, { value: TODAY_MINUS_20 }],
      notOkTests: [
        {
          value: MAX_DATE,
          errorId: LATE_ERROR,
          params: [TODAY],
        },
        {
          value: TODAY_PLUS_10,
          errorId: LATE_ERROR,
          params: [TODAY],
        },
        {
          value: MIN_DATE,
          errorId: EARLY_ERROR,
          params: [TODAY_MINUS_20],
        },
      ],
    },
  ],
  timestamp: [
    {
      description: 'default time-stamp',
      schema: { name: 'name', valueType: STAMP },
      okTests: [
        { value: NOW },
        { value: NOW_MINUS_20 },
        { value: MAX_TIMESTAMP },
        { value: MIN_TIMESTAMP },
        { value: MIN_DATE + VALID_TIME },
        { value: NOW_PLUS_10 },
        { value: MAX_DATE + VALID_TIME },
        { value: NOW_PLUS_10 },
        //hoping that this program does not survive another DEFAULT_MAX_RANGE days :-)
        { value: '2023-08-24' + ZERO_TIME },
        { value: '2004-02-29' + VALID_TIME },
        { value: '2000-02-29' + ZERO_TIME },
        { value: '2000-02-29T24:00:00.000Z' },
      ],
      notOkTests: [
        { value: undefined, errorId: STAMP_ERR },
        { value: null, errorId: STAMP_ERR },
        { value: NaN, errorId: STAMP_ERR },
        { value: '', errorId: STAMP_ERR },
        { value: 'abcd', errorId: STAMP_ERR },
        { value: 2007, errorId: STAMP_ERR },
        { value: true, errorId: STAMP_ERR },
        { value: '2000/12/20' + VALID_TIME, errorId: STAMP_ERR },
        {
          value: '12/20/2000T00-23-12.123Z',
          errorId: STAMP_ERR,
        },
        {
          value: '2000-12-40T12:13:14.123Z',
          errorId: STAMP_ERR,
        },
        {
          value: '2000-12-20Taa:13:14.123Z',
          errorId: STAMP_ERR,
        },
        {
          value: '2000-12-20T25:13:14.123Z',
          errorId: STAMP_ERR,
        },
        {
          value: '2000-12-20T12:60:14.123Z',
          errorId: STAMP_ERR,
        },
        {
          value: '2000-12-20T12:13:60.123Z',
          errorId: STAMP_ERR,
        },
        {
          value: '2000-12-20T24:00:00.123Z',
          errorId: STAMP_ERR,
        },
        {
          value: MAX_DATE_PLUS1 + VALID_TIME,
          errorId: LATE_ERROR,
          params: [MAX_DATE],
        },
        {
          value: MIN_DATE_MINUS1 + ZERO_TIME,
          errorId: EARLY_ERROR,
          params: [MIN_DATE],
        },
      ],
    },
  ],
};

describe.each(Object.entries(testSets))('%s', (_desc, cases) => {
  describe.each(cases)('$description', ({ schema, okTests, notOkTests }) => {
    const fn = createValidationFn(schema);
    if (okTests && okTests.length) {
      it.each(okTests)('"value" should be valid', ({ value, parsedValue }) => {
        //we want to test with Value types though the spec requires string to check their robustness
        const res = fn(value as string); //Actually value MAY NOT be string
        const pv = parsedValue === undefined ? (value as Value) : parsedValue;
        expect(res.messages).toBeUndefined();
        expect(res.value).toBe(pv);
      });
    }

    if (notOkTests && notOkTests.length) {
      it.each(notOkTests)(
        '"$value" should be invalid',
        ({ value, errorId, params }) => {
          const res = fn(value);
          expect(res.value).toBeUndefined();
          const error = res.messages && res.messages[0];
          expect(error).toBeDefined();
          expect(error?.messageId).toBe(errorId);
          expect(error?.params).toStrictEqual(params);
        }
      );
    }
  });
});

describe('Invalid ValueType', () => {
  it('should throw an error', () => {
    expect(() => {
      const a = { valueType: 'invalid' };
      createValidationFn(a as ValueSchema);
    }).toThrow();
  });
});
