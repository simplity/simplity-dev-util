/**
 * message ids used by the server-app
 */
export type SystemMessageName = keyof typeof systemMessages;
export const systemMessages = {
  _internalError:
    "An error was encountered while processing the request. An alert has been raised for the support team to look into this. You may try again to see if the error was due to some transient situations",
  _notAuthorized: "This operation requires proper credentials",
  _concurrentUpdate:
    "This data was concurrently modified by some one else. Please review the revised data before modifying it again",
  _invalidText: "not a valid text",
  _minLength: "should have at least ${1} characters",
  _maxLength: "may have at most ${1} characters",
  _minValue: "value should be a minimum of ${1}",
  _maxValue: "value may be at most ${1}",
  _invalidTimestamp: "a timestamp is of the form 2021-12-28T23:32:24.123Z",
  _invalidDate: "a date value is expected in the form yyyy-mm-dd",
  _invalidNumber: "not a valid number",
  _earliestDate: "date can not be earlier than ${1}",
  _latestDate: "date can not be later than ${1}",
  _invalidBoolean: "should be either true or false",
  _invalidData: "Input data has one or more errors",
  _valueRequired: "A value is required",
  _listNameRequired: "List service requested without a listName",
  _listNotConfigured: "List service not configured for processing this list",
  _dbOperationNoSuccess:
    "There was no error, but the transaction was not completed for unspecified reasons. Please try again, report this as an error",
  _invalidValue: "This value is not valid",
  _invalidName: "Name may have a max of 50 characters",
  _missingSchema:
    "Unable to validate this field because a value schema by name ${1} is missing",
} as const;
