"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_NBR_DECIMALS = exports.DEFAULT_MAX_NUMBER = exports.DEFAULT_DAYS_RANGE = exports.DEFAULT_MAX_CHARS = void 0;
exports.createValidationFn = createValidationFn;
exports.DEFAULT_MAX_CHARS = 1000;
exports.DEFAULT_DAYS_RANGE = 365000;
exports.DEFAULT_MAX_NUMBER = Number.MAX_SAFE_INTEGER;
exports.DEFAULT_NBR_DECIMALS = 2;
const DEFAULT_FACTOR = 10 ** exports.DEFAULT_NBR_DECIMALS;
const NUMBER_REGEX = /^-?\d*\.?\d*$/;
const DATE_REGEX = /^\d\d\d\d-\d\d-\d\d$/;
const TIME_REGEX = /^T\d\d:\d\d:\d\d\.\d\d\dZ$/;
const TEXT_ERROR = {
    messages: [{ alertType: 'error', messageId: '_invalidText' }],
};
const BOOL_ERROR = {
    messages: [{ alertType: 'error', messageId: '_invalidBoolean' }],
};
const NUMBER_ERROR = {
    messages: [{ alertType: 'error', messageId: '_invalidNumber' }],
};
const DATE_ERROR = {
    messages: [{ alertType: 'error', messageId: '_invalidDate' }],
};
const STAMP_ERROR = {
    messages: [{ alertType: 'error', messageId: '_invalidTimestamp' }],
};
/**
 * creates a function that can be used to validate a value against the supplied value-schema
 * @param schema schema json. Typically entered as met-date by designers, or generated by utilities
 * @returns validation function
 */
function createValidationFn(schema) {
    /**
     * all the parameters required for validation
     */
    let s = schema;
    let minLength = s.minLength || 0;
    let maxLength = s.maxLength || exports.DEFAULT_MAX_CHARS;
    let regex = s.regex ? new RegExp(s.regex) : undefined;
    let minValue = 0; //we deal with business data, and hence negative numbers not allowed by default
    let maxValue = exports.DEFAULT_MAX_NUMBER;
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
            }
            else {
                minValue = -exports.DEFAULT_DAYS_RANGE;
            }
            if (schema.maxFutureDays !== undefined) {
                maxValue = Math.round(schema.maxFutureDays);
            }
            else {
                maxValue = exports.DEFAULT_DAYS_RANGE;
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
            throw new Error(`${schema.valueType} is not a valid value type. Can not process this value-schema`);
    }
}
/*
 * createXxxFn functions are  designed to minimize the scope of teh closure around the returned function
 */
function createTextFn(schema) {
    return (value) => {
        return validateString(schema, value);
    };
}
function createNumberFn(schema) {
    return (value) => {
        return validateNumber(schema, value);
    };
}
function createDateFn(schema) {
    return (value) => {
        return validateDate(schema, value);
    };
}
function createTimestampFn(schema) {
    return (value) => {
        return validateTimestamp(schema, value);
    };
}
/*
 * run-time validation functions that use our internal schema parameters
 */
function validateString(schema, value) {
    //playing it safe with non-string argument
    if (value === undefined || value === null || Number.isNaN(value)) {
        return TEXT_ERROR;
    }
    const s = value.toString().trim();
    const len = s.length;
    if (len < schema.minLength) {
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
    if (len > schema.maxLength) {
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
function validateNumber(schema, value) {
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
function validateBoolean(value) {
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
function validateDate(schema, value) {
    const str = (value + '').trim();
    if (!DATE_REGEX.test(str)) {
        return DATE_ERROR;
    }
    const yyyy = Number.parseInt(str.substring(0, 4), 10);
    const mm = Number.parseInt(str.substring(5, 7), 10) - 1; //month index
    const dd = Number.parseInt(str.substring(8, 10), 10);
    const dateMs = Date.UTC(yyyy, mm, dd);
    const date = new Date(dateMs);
    if (dd !== date.getDate() ||
        mm !== date.getMonth() ||
        yyyy !== date.getFullYear()) {
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
function validateTimestamp(schema, value) {
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
    if (hrs > 24 ||
        mns > 59 ||
        secs > 59 || //we will not validate leap second!!
        (hrs === 24 && (mns > 0 || secs > 0))) {
        return STAMP_ERROR;
    }
    return { value: valueStr };
}
function roundIt(n, factor) {
    return Math.round(n * factor) / factor;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWIvdmFsaWRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUF1REEsZ0RBd0ZDO0FBeklZLFFBQUEsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO0FBQ3pCLFFBQUEsa0JBQWtCLEdBQUcsTUFBTSxDQUFDO0FBQzVCLFFBQUEsa0JBQWtCLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDO0FBQzdDLFFBQUEsb0JBQW9CLEdBQUcsQ0FBQyxDQUFDO0FBRXRDLE1BQU0sY0FBYyxHQUFHLEVBQUUsSUFBSSw0QkFBb0IsQ0FBQztBQUNsRCxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUM7QUFDckMsTUFBTSxVQUFVLEdBQUcsc0JBQXNCLENBQUM7QUFDMUMsTUFBTSxVQUFVLEdBQUcsNEJBQTRCLENBQUM7QUFFaEQsTUFBTSxVQUFVLEdBQTBCO0lBQ3hDLFFBQVEsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLENBQUM7Q0FDOUQsQ0FBQztBQUNGLE1BQU0sVUFBVSxHQUEwQjtJQUN4QyxRQUFRLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLENBQUM7Q0FDakUsQ0FBQztBQUNGLE1BQU0sWUFBWSxHQUEwQjtJQUMxQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLENBQUM7Q0FDaEUsQ0FBQztBQUNGLE1BQU0sVUFBVSxHQUEwQjtJQUN4QyxRQUFRLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxDQUFDO0NBQzlELENBQUM7QUFDRixNQUFNLFdBQVcsR0FBMEI7SUFDekMsUUFBUSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFF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