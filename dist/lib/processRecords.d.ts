import { CompositeRecord, Record, SimpleRecord, StringMap } from 'simplity-types';
export type ProcessedRecords = {
    all: StringMap<Record>;
    /**
     * simple/extended records
     */
    simple: StringMap<SimpleRecord>;
    /**
     * composite Records: called as clientForm by the server
     */
    composite: StringMap<CompositeRecord>;
    /**
     * names of extended records that failed the conversion process
     */
    wrongOnes: StringMap<true>;
};
/**
 * Records are designed with a syntax that allows extending, and copying fields from one another
 * It is better to make each record independent of the other for run time effeciemcy.
 * This function processes the record components to achieve that independence.
 */
export declare function processRecords(records: StringMap<Record>): [ProcessedRecords, number];
