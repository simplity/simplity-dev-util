/**
 * Records are designed with a syntax that allows extending, and copying fields from one another
 * It is better to make each record independent of the other for run time effeciemcy.
 * This function processes the record components to achieve that independence.
 */
export function processRecords(records) {
    const allRecords = {
        all: records,
        simple: {},
        composite: {},
        wrongOnes: {},
    };
    let nbrErrors = 0;
    for (const [name, record] of Object.entries(allRecords.all)) {
        const rt = record.recordType;
        if (rt === 'composite') {
            allRecords.composite[name] = record;
        }
        else if (rt === 'simple') {
            allRecords.simple[name] = record;
        }
        else {
            //we have to extend it. Let us do it later
        }
    }
    //extend all the "extended" records
    for (const record of Object.values(allRecords.all)) {
        if (record.recordType === 'extended') {
            //convert it to simple and add it to records collection
            let [, n] = toSimpleRecord(record, allRecords, []);
            nbrErrors += n;
        }
    }
    return [allRecords, nbrErrors];
}
/**
 * convert the extended record to simple record, and add it to the records collections
 * @returns new simple record that is already added to the records collection
 */
function toSimpleRecord(record, comps, dependencies) {
    const recordName = record.name;
    const sr = comps.simple[recordName];
    if (sr) {
        //already converted and put to records. This happens if it was a main-record for another extended record
        return [undefined, 0];
    }
    if (comps.wrongOnes[recordName]) {
        //already detected as a problematic one
        return [undefined, 0];
    }
    const mainRecordName = record.mainRecordName;
    if (recordName === mainRecordName) {
        console.error(`Error: Extended ${recordName} has set itself as its mainRecord!! `);
        comps.wrongOnes[recordName] = true;
        return [undefined, 1];
    }
    //are we getting into an infinite loop?
    const idx = dependencies.indexOf(recordName);
    if (idx !== -1) {
        console.error(`Error: Record ${recordName} is an extended record, but has a cyclical/recursive dependency on itself`);
        const t = dependencies.slice(idx);
        t.push(recordName);
        console.error(t.join(' --> '));
        //actually, all the entries are wrong ones, but we will anyway go through them as the recursive function returns...
        comps.wrongOnes[recordName] = true;
        return [undefined, t.length];
    }
    let mainRecord = comps.simple[mainRecordName];
    if (!mainRecord) {
        mainRecord = comps.all[mainRecordName];
        if (mainRecord === undefined) {
            console.error(`Error: Extended record ${recordName} uses mainRecordName="${mainRecordName}", but that record is not defined`);
            comps.wrongOnes[recordName] = true;
            return [undefined, 1];
        }
        if (mainRecord.recordType === 'composite') {
            console.error(`Error: Extended record ${recordName} uses mainRecordName="${mainRecordName}", but that is a form/composite-record`);
            comps.wrongOnes[recordName] = true;
            return [undefined, 1];
        }
        /**
         * recurse to get the main-record converted first
         */
        dependencies.push(recordName);
        [mainRecord] = toSimpleRecord(mainRecord, comps, dependencies);
        dependencies.pop();
        if (!mainRecord) {
            comps.wrongOnes[recordName] = true;
            return [undefined, 1];
        }
    }
    const newRecord = extendIt(record, mainRecord);
    if (!newRecord) {
        comps.wrongOnes[recordName] = true;
        return [undefined, 1];
    }
    comps.simple[recordName] = newRecord;
    return [newRecord, 0];
}
function extendIt(recordToExtend, ref) {
    const obj = {
        ...ref,
        ...recordToExtend,
        recordType: 'simple',
    };
    delete obj.fieldNames;
    delete obj.additionalFields;
    delete obj.mainRecordName;
    if (!recordToExtend.nameInDb && !recordToExtend.operations && ref.nameInDb) {
        //extended record does not want any db operation. Let's not override it.
        delete obj.nameInDb;
        delete obj.operations;
    }
    const newFields = [];
    obj.fields = newFields;
    const newRecord = obj;
    //fields from ref records into a map
    const refFields = {};
    for (const field of ref.fields) {
        refFields[field.name] = field;
    }
    if (recordToExtend.fieldNames && recordToExtend.fieldNames[0] !== '*') {
        // subset of fields to be copied
        for (const fieldName of recordToExtend.fieldNames) {
            const field = refFields[fieldName];
            if (!field) {
                console.error(`Error: Extended record ${recordToExtend.name} specifies ${fieldName} as a reference field but that field is not defined in the reference record ${ref.name}. Field skipped`);
                return undefined;
            }
            newFields.push(field);
        }
    }
    else {
        // copy all records
        for (const field of ref.fields) {
            newFields.push(field);
        }
    }
    if (recordToExtend.additionalFields) {
        for (const field of recordToExtend.additionalFields) {
            if (refFields[field.name]) {
                if (replaceField(field, newRecord.fields)) {
                    continue; // replaced an existing entry in the array
                }
            }
            newFields.push(field);
        }
    }
    return newRecord;
}
function replaceField(field, fields) {
    const fieldName = field.name;
    for (let i = 0; i < fields.length; i++) {
        if (fields[i].name === fieldName) {
            fields[i] = field;
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=processRecords.js.map