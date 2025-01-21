/**
 * message ids used by the server-app
 */
export type SystemMessageName = keyof typeof systemMessages;
export declare const systemMessages: {
    readonly _internalError: "An error was encountered while processing the request. An alert has been raised for the support team to look into this. You may try again to see if the error was due to some transient situations";
    readonly _notAuthorized: "This operation requires proper credentials";
    readonly _concurrentUpdate: "This data was concurrently modified by some one else. Please review the revised data before modifying it again";
    readonly _invalidText: "not a valid text";
    readonly _minLength: "should have at least ${1} characters";
    readonly _maxLength: "may have at most ${1} characters";
    readonly _minValue: "value should be a minimum of ${1}";
    readonly _maxValue: "value may be at most ${1}";
    readonly _invalidTimestamp: "a timestamp is of the form 2021-12-28T23:32:24.123Z";
    readonly _invalidDate: "a date value is expected in the form yyyy-mm-dd";
    readonly _invalidNumber: "not a valid number";
    readonly _earliestDate: "date can not be earlier than ${1}";
    readonly _latestDate: "date can not be later than ${1}";
    readonly _invalidBoolean: "should be either true or false";
    readonly _invalidData: "Input data has one or more errors";
    readonly _valueRequired: "A value is required";
    readonly _listNameRequired: "List service requested without a listName";
    readonly _listNotConfigured: "List service not configured for processing this list";
    readonly _dbOperationNoSuccess: "There was no error, but the transaction was not completed for unspecified reasons. Please try again, report this as an error";
    readonly _invalidValue: "This value is not valid";
    readonly _invalidName: "Name may have a max of 50 characters";
    readonly _missingSchema: "Unable to validate this field because a value schema by name ${1} is missing";
};
