import { Value, ValueType, ValueSchema } from 'simplity-types';
type TestSets = {
    [valueType in ValueType]: TestCases[];
};
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
export declare const testSets: TestSets;
export {};
