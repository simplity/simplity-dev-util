"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSets = void 0;
const validation_1 = require("./validation");
const globals_1 = require("@jest/globals");
let b = '';
for (let i = 0; i < validation_1.DEFAULT_MAX_CHARS; i++) {
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
const todayPlus10 = new Date(Date.UTC(nowYear, nowMon, nowDate + 10, 0, 0, 0, 0));
const todayMinus20 = new Date(Date.UTC(nowYear, nowMon, nowDate - 20, 0, 0, 0, 0));
const maxDate = new Date(Date.UTC(nowYear, nowMon, nowDate + validation_1.DEFAULT_DAYS_RANGE, 0, 0, 0, 0));
const minDate = new Date(Date.UTC(nowYear, nowMon, nowDate - validation_1.DEFAULT_DAYS_RANGE, 0, 0, 0, 0));
const minDateMinus1 = new Date(Date.UTC(nowYear, nowMon, nowDate - validation_1.DEFAULT_DAYS_RANGE - 1));
const maxDatePlus1 = new Date(Date.UTC(nowYear, nowMon, nowDate + validation_1.DEFAULT_DAYS_RANGE + 1));
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
exports.testSets = {
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
            description: 'boolean with max/min length. expect the lengths to be ignored',
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
            description: `default text-type. expect min-length as 0 and max length as ${validation_1.DEFAULT_MAX_CHARS}`,
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
                    params: [validation_1.DEFAULT_MAX_CHARS + ''],
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
            },
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
            description: 'schema has max less than min, hence no string would be valid',
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
                    params: [validation_1.DEFAULT_MAX_NUMBER + ''],
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
                    params: [validation_1.DEFAULT_MAX_NUMBER + ''],
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
globals_1.describe.each(Object.entries(exports.testSets))('%s', (_desc, cases) => {
    globals_1.describe.each(cases)('$description', ({ schema, okTests, notOkTests }) => {
        const fn = (0, validation_1.createValidationFn)(schema);
        if (okTests && okTests.length) {
            globals_1.it.each(okTests)('"value" should be valid', ({ value, parsedValue }) => {
                //we want to test with Value types though the spec requires string to check their robustness
                const res = fn(value); //Actually value MAY NOT be string
                const pv = parsedValue === undefined ? value : parsedValue;
                (0, globals_1.expect)(res.messages).toBeUndefined();
                (0, globals_1.expect)(res.value).toBe(pv);
            });
        }
        if (notOkTests && notOkTests.length) {
            globals_1.it.each(notOkTests)('"$value" should be invalid', ({ value, errorId, params }) => {
                const res = fn(value);
                (0, globals_1.expect)(res.value).toBeUndefined();
                const error = res.messages && res.messages[0];
                (0, globals_1.expect)(error).toBeDefined();
                (0, globals_1.expect)(error?.messageId).toBe(errorId);
                (0, globals_1.expect)(error?.params).toStrictEqual(params);
            });
        }
    });
});
(0, globals_1.describe)('Invalid ValueType', () => {
    (0, globals_1.it)('should throw an error', () => {
        (0, globals_1.expect)(() => {
            const a = { valueType: 'invalid' };
            (0, validation_1.createValidationFn)(a);
        }).toThrow();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi92YWxpZGF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNkNBS3NCO0FBQ3RCLDJDQUFxRDtBQXFCckQsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ1gsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLDhCQUFpQixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7SUFDM0MsQ0FBQyxJQUFJLEdBQUcsQ0FBQztBQUNYLENBQUM7QUFDRCxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUM7QUFDbkIsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO0FBRWxDLHFFQUFxRTtBQUNyRSxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0FBQ3ZCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNsQyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDOUIsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBRTlCLHdDQUF3QztBQUN4QyxNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkUsTUFBTSxXQUFXLEdBQUcsSUFBSSxJQUFJLENBQzFCLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNwRCxDQUFDO0FBRUYsTUFBTSxZQUFZLEdBQUcsSUFBSSxJQUFJLENBQzNCLElB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