"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMeta = processMeta;
const fs_1 = require("fs");
const simplity_types_1 = require("simplity-types");
const generatePage_1 = require("./generatePage");
const alterPage_1 = require("./alterPage");
/**
 * process the design components to generate derived components for the server as well as the client
 * 1. JSOn files are created for the server side.
 * 2. ts files for ListSources are generated for the client-side
 * 3. ts files for Form are generated for the client-side
 * 4. pages are generated, and altered if required, for all the templates.
 * @param appDesign all the input for processing
 * @param jsonFolder where the json files are to be written out.
 * The folder is emptied before writing out generated JSONs.
 * @param tsFolder where typescript files are written out.
 * The folder is emptied before writing out generated ts files.
 *
 */
function processMeta(meta, jsonFolder, tsFolder) {
    (0, fs_1.rmSync)(jsonFolder, { recursive: true, force: true });
    (0, fs_1.mkdirSync)(jsonFolder);
    (0, fs_1.rmSync)(tsFolder, { recursive: true, force: true });
    (0, fs_1.mkdirSync)(tsFolder);
    let fileName = jsonFolder + 'application.json';
    const appJson = {
        appName: meta.name,
        maxLengthForTextField: meta.maxLengthForTextField,
        tenantFieldName: meta.tenantFieldName,
        tenantNameInDb: meta.tenantNameInDb,
    };
    /**
     * 1. application.json
     */
    (0, fs_1.writeFileSync)(fileName, JSON.stringify(appJson));
    done(fileName);
    /**
     * 2. valueLists.json
     */
    fileName = jsonFolder + 'valueLists.json';
    (0, fs_1.writeFileSync)(fileName, JSON.stringify({
        valueLists: { ...simplity_types_1.systemResources.valueLists, ...meta.valueLists },
    }));
    done(fileName);
    /**
     * 3. messages.json
     */
    fileName = jsonFolder + 'messages.json';
    (0, fs_1.writeFileSync)(fileName, JSON.stringify({
        messages: { ...simplity_types_1.systemResources.messages, ...meta.messages },
    }));
    done(fileName);
    /**
     * 4. valueSchemas.json
     */
    fileName = jsonFolder + 'valueSchemas.json';
    (0, fs_1.writeFileSync)(fileName, JSON.stringify({
        valueSchemas: {
            ...simplity_types_1.systemResources.valueSchemas,
            ...meta.valueSchemas,
        },
    }));
    done(fileName);
    /**
     * records are quite clumsy as of now because of the mismatch between the way the server and the client use the terms "forms" and "records".
     * This needs some serious re-factoring
     */
    const comps = {
        all: { ...simplity_types_1.systemResources.records, ...meta.records },
        forms: {},
        records: {},
        wrongOnes: {},
    };
    organizeRecords(comps);
    /**
     * 5. records.json
     */
    writeJsons(jsonFolder, 'rec', comps.all);
    /**
     * 6. forms.json
     */
    writeJsons(jsonFolder, 'form', comps.forms);
    /**
     * 7. sql.json
     */
    writeJsons(jsonFolder, 'sql', meta.sqls || {});
    /**
     * done with server side. Let's now generate .ts files
     */
    /**
     * 8. listSources.ts
     */
    generateListSources(meta.valueLists, tsFolder);
    /**
     * 9. form.ts and /form/*.ts
     */
    //forms are needed for tus to generate pages
    const forms = {};
    generateForms(comps, forms);
    writeAll(forms, tsFolder, 'Form', 'forms');
    /**
     * 10. pages.ts from /template/*.ts and alter /pageAlterations
     */
    const pages = { ...(meta.pages || {}) };
    generatePages(meta.templates || {}, meta.pageAlterations || {}, forms, pages);
    writeAll(pages, tsFolder, 'Page', 'pages');
}
function done(fileName) {
    console.info(`file ${fileName} created.`);
}
function organizeRecords(comps) {
    for (const [name, record] of Object.entries(comps.all)) {
        if (record.recordType === 'composite') {
            comps.forms[name] = record;
        }
        else if (record.recordType === 'simple') {
            comps.records[name] = record;
        } //else it is extended. We will handle it later
    }
    /**
     * expand all extended records
     */
    for (const record of Object.values(comps.all)) {
        if (record.recordType === 'extended') {
            toSimpleRecord(record, comps, []);
        }
    }
}
function toSimpleRecord(record, comps, dependencies) {
    const name = record.name;
    if (comps.wrongOnes[name]) {
        //already detected
        return undefined;
    }
    //are we getting into an infinite loop?
    const idx = dependencies.indexOf(name);
    if (idx !== -1) {
        console.error(`Record ${name} is an extended record, but has a recursive dependency on itself`);
        const t = dependencies.slice(idx);
        t.push(name);
        console.error(t.join(' --> '));
        //actually, all the entries are wrong ones, but we will anyway go through them as the recursive function returns...
        comps.wrongOnes[name] = true;
        return undefined;
    }
    const mainRecordName = record.mainRecordName;
    const mainRecord = comps.all[mainRecordName];
    if (mainRecord === undefined) {
        console.error(`Extended record ${name} uses mainRecordName="${mainRecordName}", but that record is not defined`);
        comps.wrongOnes[name] = true;
        return undefined;
    }
    if (mainRecord.recordType === 'composite') {
        console.error(`Extended record ${name} uses mainRecordName="${mainRecordName}", but that is a form/composite-record`);
        comps.wrongOnes[name] = true;
        return undefined;
    }
    let refRecord;
    if (mainRecord.recordType === 'simple') {
        refRecord = mainRecord;
    }
    else {
        //we need to covert this first
        refRecord = comps.records[mainRecordName];
        if (!refRecord) {
            dependencies.push(mainRecordName);
            refRecord = toSimpleRecord(mainRecord, comps, dependencies);
            dependencies.pop();
        }
    }
    if (refRecord === undefined) {
        comps.wrongOnes[name] = true;
        return undefined;
    }
    const newRecord = extendIt(record, refRecord);
    comps.records[name] = newRecord;
    return newRecord;
}
function extendIt(record, ref) {
    const newRecord = {
        ...ref,
        ...record,
        recordType: 'simple',
    };
    if (record.fieldNames) {
        const fields = {};
        for (const field of ref.fields) {
            fields[field.name] = field;
        }
        const newFields = [];
        for (const fieldName of record.fieldNames) {
            const field = fields[fieldName];
            if (field) {
                newFields.push(field);
            }
            else {
                console.error(`Extended record ${record.name} specifies ${fieldName} as a reference field but that field is not defined in the reference record ${ref.name}. Field skipped`);
            }
        }
        newRecord.fields = newFields;
        delete newRecord.fieldNames;
    }
    if (record.additionalFields) {
        const fields = newRecord.fields;
        for (const field of record.additionalFields) {
            fields.push(field);
        }
        delete newRecord.additionalFields;
    }
    return newRecord;
}
function copyAttrs(fromObj, toObj, attrs) {
    for (const attr of attrs) {
        const value = fromObj[attr];
        if (value !== undefined) {
            toObj[attr] = value;
        }
    }
}
function writeJsons(jsonFolder, typ, comps) {
    const folder = jsonFolder + typ + '/';
    (0, fs_1.mkdirSync)(folder);
    for (const [name, comp] of Object.entries(comps)) {
        if (name !== comp.name) {
            console.error(`Component with name='${comp.name}' is indexed with key='${name}. This is incorrect. Name should match the indexed-key to ensure that the name is unique across all records\n json NOT created for this record`);
            continue;
        }
        const fileName = folder + name + '.' + typ + '.json';
        (0, fs_1.writeFileSync)(fileName, JSON.stringify(comp));
        done(fileName);
    }
}
function generateListSources(valueLists, tsFolder) {
    const listSources = {};
    for (const [name, list] of Object.entries(valueLists)) {
        if (list.listType === 'simple') {
            listSources[name] = {
                name,
                isKeyed: false,
                isRuntime: false,
                okToCache: true,
                list: list.list,
            };
        }
        else if (list.listType === 'keyed') {
            listSources[name] = {
                name,
                isKeyed: true,
                isRuntime: false,
                okToCache: true,
                keyedList: list.keyedList,
            };
        }
    }
    const str = "import { StringMap, ListSource } from 'simplity-types';\nexport const listSources: StringMap<ListSource> = " +
        JSON.stringify(listSources) +
        ';\n';
    const fileName = tsFolder + 'listSources.ts';
    (0, fs_1.writeFileSync)(fileName, str);
    done(fileName);
}
function generateForms(comps, forms) {
    for (const [name, record] of Object.entries(comps.all)) {
        if (!record.isVisibleToClient) {
            console.info(`Record ${name} is not visible to the client-side. Form not created.`);
            continue;
        }
        let sr;
        let childRecords;
        if (record.recordType === 'simple') {
            sr = record;
        }
        else if (record.recordType === 'extended') {
            sr = comps.records[name];
        }
        else {
            childRecords = record.childRecords;
            const ref = comps.records[record.mainRecordName];
            if (ref === undefined) {
                console.error(`Composite Record "${name}" has mainRecord="${record.mainRecordName}" but that record is not defined, or is a composite-record. Source NOT generated`);
                continue;
            }
            const temp = { ...record };
            delete temp.childForms;
            temp.fields = ref.fields;
            sr = temp;
        }
        const form = toForm(sr);
        if (childRecords) {
            form.childForms = toChildForms(childRecords);
        }
        forms[name] = form;
    }
}
function toForm(record) {
    const form = {};
    copyAttrs(record, form, [
        'name',
        //"operations",
        'serveGuests',
        'validationFn',
        'interFieldValidations',
        'childRecords',
    ]);
    if (record.operations !== undefined) {
        const ops = {};
        for (const op of record.operations) {
            ops[op] = true;
        }
        form.operations = ops;
    }
    const [fields, fieldNames, keyFields] = toDataFields(record.fields);
    form.fieldNames = fieldNames;
    form.fields = fields;
    if (keyFields) {
        form.keyFields = keyFields;
    }
    return form;
}
function toDataFields(recordFields) {
    const fields = {};
    const names = [];
    let keyFields = [];
    for (const f of recordFields) {
        names.push(f.name);
        fields[f.name] = toDataField(f);
        if (f.fieldType === 'generatedPrimaryKey' || f.fieldType === 'primaryKey') {
            keyFields.push(f.name);
        }
    }
    if (keyFields.length === 0) {
        return [fields, names, undefined];
    }
    return [fields, names, keyFields];
}
function toDataField(field) {
    const dataField = {};
    copyAttrs(field, dataField, [
        'cssClassNames',
        'customHtml',
        'defaultValue',
        'hint',
        'imageNamePrefix',
        'imageNameSuffix',
        'isPassword',
        //"isRequired",
        'label',
        'listKeyName',
        'listName',
        'listOptions',
        'name',
        'onBeingChanged',
        'onChange',
        'onClick',
        'renderAs',
        'valueSchema',
        'valueType',
        'width',
    ]);
    dataField.isRequired = !!field.isRequired;
    dataField.compType = 'field';
    if (!field.renderAs) {
        dataField.renderAs = getRenderAs(field, field.valueType);
    }
    return dataField;
}
function toChildForms(childRecords) {
    const children = {};
    for (const cr of childRecords) {
        const child = {};
        copyAttrs(cr, child, [
            'errorId',
            //"formName",
            'isEditable',
            'isTable',
            'label',
            'maxRows',
            'minRows',
            //"name",
        ]);
        child.name = cr.linkName;
        child.formName = cr.childRecordName;
        children[child.name] = child;
    }
    return children;
}
function getRenderAs(field, valueType) {
    if (field.listName) {
        return 'select';
    }
    if (valueType === 'boolean') {
        return 'check-box';
    }
    switch (field.fieldType) {
        case 'primaryKey':
        case 'optionalData':
        case 'requiredData':
            return 'text-field';
        default:
            return 'output';
    }
}
/**
 * simplity generates the pages ate boot-time before loading them to memory.
 * generated pages are NOT used by simplity. This is only for the developer's to understand and possibly debug issues in page meta data
 */
function generatePages(templates, alterations, forms, pages) {
    for (const [name, template] of Object.entries(templates)) {
        const form = forms[template.formName];
        if (form) {
            (0, generatePage_1.generatePage)(template, form, pages);
            console.info(`page template ${name} processed to generate page/s`);
        }
        else {
            console.error(`template ${template} requires form ${template.formName}, but that form is not found`);
        }
    }
    for (const [name, alts] of Object.entries(alterations)) {
        const page = pages[name];
        if (page) {
            (0, alterPage_1.alterPage)(page, alts);
            console.info(`page ${name} altered`);
        }
        else {
            console.error(`Alterations found for ${name} but the page is not found. Alterations skipped`);
        }
    }
}
function writeAll(comps, rootFolder, typ, allCompsName) {
    let folderName = rootFolder + allCompsName + '/';
    (0, fs_1.mkdirSync)(folderName, { recursive: true });
    /**
     * write individual files in the sub-folder
     */
    const compNames = [];
    for (const [name, comp] of Object.entries(comps)) {
        compNames.push(name);
        const fileName = folderName + name + '.ts';
        (0, fs_1.writeFileSync)(fileName, `import {  ${typ} } from 'simplity-types';\nexport const ${name}: ${typ} = ${JSON.stringify(comp)};\n`);
        done(fileName);
    }
    /**
     * write the allCOmps file in the root-folder
     */
    const t = [`import { StringMap, ${typ} } from 'simplity-types';`];
    for (const name of compNames) {
        t.push(`import { ${name} } from './${allCompsName}/${name}';`);
    }
    // emit object members
    t.push(`\nexport const ${allCompsName}: StringMap<${typ}> = {`);
    for (const name of compNames) {
        t.push(`\t${name},`);
    }
    t.push('};\n');
    const fileName = rootFolder + allCompsName + '.ts';
    (0, fs_1.writeFileSync)(fileName, t.join('\n'));
    done(fileName);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc01ldGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3Byb2Nlc3NNZXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBbUVBLGtDQWdIQztBQW5MRCwyQkFBc0Q7QUFDdEQsbURBdUJ3QjtBQUN4QixpREFBOEM7QUFDOUMsMkNBQXdDO0FBNEJ4Qzs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSCxTQUFnQixXQUFXLENBQ3pCLElBQWEsRUFDYixVQUFrQixFQUNsQixRQUFnQjtJQUVoQixJQUFBLFdBQU0sRUFBQyxVQUFVLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3JELElBQUEsY0FBUyxFQUFDLFVBQVUsQ0FBQyxDQUFDO0lBRXRCLElBQUEsV0FBTSxFQUFDLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDbkQsSUFBQSxjQUFTLEVBQUMsUUFBUSxDQUFDLENBQUM7SUFFcEIsSUFBSSxRQUFRLEdBQUcsVUFBVSxHQUFHLGtCQUFrQixDQUFDO0lBQy9DLE1BQU0sT0FBTyxHQUFZO1FBQ3ZCLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSTtRQUNsQixxQkFBcUIsRUFBRSxJQUFJLENBQUMscUJBQXFCO1FBQ2pELGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZTtRQUNyQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7S0FDcEMsQ0FBQztJQUNGOztPQUVHO0lBQ0gsSUFBQSxrQkFBYSxFQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDakQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRWY7O09BRUc7SUFDSCxRQUFRLEdBQUcsVUFBVSxHQUFHLGlCQUFpQixDQUFDO0lBQzFDLElBQUEsa0JBQWEsRUFDWCxRQUFRLEVBQ1IsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUNiLFVBQVUsRUFBRSxFQUFFLEdBQUcsZ0NBQWUsQ0FBQyxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFO0tBQ2xFLENBQUMsQ0FDSCxDQUFDO0lBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRWY7O09BRUc7SUFDSCxRQUFRLEdBQUcsVUFBVSxHQUFHLGVBQWUsQ0FBQztJQUN4QyxJQUFBLGtCQUFhLEVBQ1gsUUFBUSxFQUNSLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDYixRQUFRLEVBQUUsRUFBRSxHQUFHLGdDQUFlLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRTtLQUM1RCxDQUFDLENBQ0gsQ0FBQztJQUNGLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUVmOztPQUVHO0lBQ0gsUUFBUSxHQUFHLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQztJQUM1QyxJQUFBLGtCQUFhLEVBQ1gsUUFBUSxFQUNSLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDYixZQUFZLEVBQUU7WUFDWixHQUFHLGdDQUFlLENBQUMsWUFBWTtZQUMvQixHQUFHLElBQUksQ0FBQyxZQUFZO1NBQ3JCO0tBQ0YsQ0FBQyxDQUNILENBQUM7SUFDRixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFZjs7O09BR0c7SUFDSCxNQUFNLEtBQUssR0FBZTtRQUN4QixHQUFHLEVBQUUsRUFBRSxHQUFHLGdDQUFlLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUNwRCxLQUFLLEVBQUUsRUFBRTtRQUNULE9BQU8sRUFBRSxFQUFFO1FBQ1gsU0FBUyxFQUFFLEVBQUU7S0FDZCxDQUFDO0lBRUYsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXZCOztPQUVHO0lBQ0gsVUFBVSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pDOztPQUVHO0lBQ0gsVUFBVSxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRTVDOztPQUVHO0lBQ0gsVUFBVSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQztJQUUvQzs7T0FFRztJQUNIOztPQUVHO0lBQ0gsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUUvQzs7T0FFRztJQUNILDRDQUE0QztJQUM1QyxNQUFNLEtBQUssR0FBb0IsRUFBRSxDQUFDO0lBQ2xDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDNUIsUUFBUSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRTNDOztPQUVHO0lBQ0gsTUFBTSxLQUFLLEdBQW9CLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUN6RCxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLGVBQWUsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzlFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM3QyxDQUFDO0FBRUQsU0FBUyxJQUFJLENBQUMsUUFBZ0I7SUFDNUIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLFFBQVEsV0FBVyxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLEtBQWlCO0lBQ3hDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3ZELElBQUksTUFBTSxDQUFDLFVBQVUsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUN0QyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQztRQUM3QixDQUFDO2FBQU0sSUFBSSxNQUFNLENBQUMsVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBQy9CLENBQUMsQ0FBQyw4Q0FBOEM7SUFDbEQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxNQUFNLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzlDLElBQUksTUFBTSxDQUFDLFVBQVUsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNyQyxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwQyxDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FDckIsTUFBc0IsRUFDdEIsS0FBaUIsRUFDakIsWUFBc0I7SUFFdEIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztJQUV6QixJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUMxQixrQkFBa0I7UUFDbEIsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUVELHVDQUF1QztJQUN2QyxNQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZDLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUNYLFVBQVUsSUFBSSxrRUFBa0UsQ0FDakYsQ0FBQztRQUNGLE1BQU0sQ0FBQyxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQy9CLG1IQUFtSDtRQUNuSCxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztRQUM3QixPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBRUQsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQztJQUM3QyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzdDLElBQUksVUFBVSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQzdCLE9BQU8sQ0FBQyxLQUFLLENBQ1gsbUJBQW1CLElBQUkseUJBQXlCLGNBQWMsbUNBQW1DLENBQ2xHLENBQUM7UUFDRixLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztRQUM3QixPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBRUQsSUFBSSxVQUFVLENBQUMsVUFBVSxLQUFLLFdBQVcsRUFBRSxDQUFDO1FBQzFDLE9BQU8sQ0FBQyxLQUFLLENBQ1gsbUJBQW1CLElBQUkseUJBQXlCLGNBQWMsd0NBQXdDLENBQ3ZHLENBQUM7UUFDRixLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztRQUM3QixPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBRUQsSUFBSSxTQUFtQyxDQUFDO0lBQ3hDLElBQUksVUFBVSxDQUFDLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUN2QyxTQUFTLEdBQUcsVUFBVSxDQUFDO0lBQ3pCLENBQUM7U0FBTSxDQUFDO1FBQ04sOEJBQThCO1FBQzlCLFNBQVMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNmLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDbEMsU0FBUyxHQUFHLGNBQWMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQzVELFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNyQixDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQzVCLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQzdCLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzlDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDO0lBQ2hDLE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxNQUFzQixFQUFFLEdBQWlCO0lBQ3pELE1BQU0sU0FBUyxHQUF1QjtRQUNwQyxHQUFHLEdBQUc7UUFDTixHQUFHLE1BQU07UUFDVCxVQUFVLEVBQUUsUUFBUTtLQUNyQixDQUFDO0lBRUYsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDdEIsTUFBTSxNQUFNLEdBQXFCLEVBQUUsQ0FBQztRQUNwQyxLQUFLLE1BQU0sS0FBSyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUM3QixDQUFDO1FBQ0QsTUFBTSxTQUFTLEdBQVksRUFBRSxDQUFDO1FBQzlCLEtBQUssTUFBTSxTQUFTLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNoQyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNWLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEIsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLE9BQU8sQ0FBQyxLQUFLLENBQ1gsbUJBQW1CLE1BQU0sQ0FBQyxJQUFJLGNBQWMsU0FBUywrRUFBK0UsR0FBRyxDQUFDLElBQUksaUJBQWlCLENBQzlKLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUNELFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO1FBQzdCLE9BQU8sU0FBUyxDQUFDLFVBQVUsQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUM1QixNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBaUIsQ0FBQztRQUMzQyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzVDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckIsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDLGdCQUFnQixDQUFDO0lBQ3BDLENBQUM7SUFFRCxPQUFPLFNBQXlCLENBQUM7QUFDbkMsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUNoQixPQUEyQixFQUMzQixLQUF5QixFQUN6QixLQUFlO0lBRWYsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUN6QixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUIsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDeEIsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUN0QixDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FDakIsVUFBa0IsRUFDbEIsR0FBVyxFQUNYLEtBQTZCO0lBRTdCLE1BQU0sTUFBTSxHQUFHLFVBQVUsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQ3RDLElBQUEsY0FBUyxFQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xCLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDakQsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUssRUFBRSxDQUFDO1lBQ3hCLE9BQU8sQ0FBQyxLQUFLLENBQ1gsd0JBQXdCLElBQUksQ0FBQyxJQUFJLDBCQUEwQixJQUFJLGdKQUFnSixDQUNoTixDQUFDO1lBQ0YsU0FBUztRQUNYLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsT0FBTyxDQUFDO1FBQ3JELElBQUEsa0JBQWEsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNqQixDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQzFCLFVBQWdDLEVBQ2hDLFFBQWdCO0lBRWhCLE1BQU0sV0FBVyxHQUEwQixFQUFFLENBQUM7SUFDOUMsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztRQUN0RCxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDL0IsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHO2dCQUNsQixJQUFJO2dCQUNKLE9BQU8sRUFBRSxLQUFLO2dCQUNkLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixTQUFTLEVBQUUsSUFBSTtnQkFDZixJQUFJLEVBQUcsSUFBa0IsQ0FBQyxJQUFJO2FBQy9CLENBQUM7UUFDSixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ3JDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRztnQkFDbEIsSUFBSTtnQkFDSixPQUFPLEVBQUUsSUFBSTtnQkFDYixTQUFTLEVBQUUsS0FBSztnQkFDaEIsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsU0FBUyxFQUFHLElBQXVCLENBQUMsU0FBUzthQUM5QyxDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7SUFDRCxNQUFNLEdBQUcsR0FDUCw2R0FBNkc7UUFDN0csSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUM7UUFDM0IsS0FBSyxDQUFDO0lBQ1IsTUFBTSxRQUFRLEdBQUcsUUFBUSxHQUFHLGdCQUFnQixDQUFDO0lBQzdDLElBQUEsa0JBQWEsRUFBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDN0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pCLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxLQUFpQixFQUFFLEtBQXNCO0lBQzlELEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3ZELElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM5QixPQUFPLENBQUMsSUFBSSxDQUNWLFVBQVUsSUFBSSx1REFBdUQsQ0FDdEUsQ0FBQztZQUNGLFNBQVM7UUFDWCxDQUFDO1FBRUQsSUFBSSxFQUE0QixDQUFDO1FBQ2pDLElBQUksWUFBdUMsQ0FBQztRQUM1QyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDbkMsRUFBRSxHQUFHLE1BQXNCLENBQUM7UUFDOUIsQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLFVBQVUsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUM1QyxFQUFFLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQixDQUFDO2FBQU0sQ0FBQztZQUNOLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDO1lBQ25DLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRWpELElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN0QixPQUFPLENBQUMsS0FBSyxDQUNYLHFCQUFxQixJQUFJLHFCQUFxQixNQUFNLENBQUMsY0FBYyxrRkFBa0YsQ0FDdEosQ0FBQztnQkFDRixTQUFTO1lBQ1gsQ0FBQztZQUVELE1BQU0sSUFBSSxHQUF1QixFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUM7WUFDL0MsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztZQUN6QixFQUFFLEdBQUcsSUFBb0IsQ0FBQztRQUM1QixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hCLElBQUksWUFBWSxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLFVBQVUsR0FBRyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDckIsQ0FBQztBQUNILENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxNQUFvQjtJQUNsQyxNQUFNLElBQUksR0FBdUIsRUFBRSxDQUFDO0lBQ3BDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFO1FBQ3RCLE1BQU07UUFDTixlQUFlO1FBQ2YsYUFBYTtRQUNiLGNBQWM7UUFDZCx1QkFBdUI7UUFDdkIsY0FBYztLQUNmLENBQUMsQ0FBQztJQUVILElBQUksTUFBTSxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUNwQyxNQUFNLEdBQUcsR0FBd0IsRUFBRSxDQUFDO1FBQ3BDLEtBQUssTUFBTSxFQUFFLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ25DLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDakIsQ0FBQztRQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUMsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3BFLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0lBQzdCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3JCLElBQUksU0FBUyxFQUFFLENBQUM7UUFDZCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUM3QixDQUFDO0lBRUQsT0FBTyxJQUFZLENBQUM7QUFDdEIsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUNuQixZQUFxQjtJQUVyQixNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFDO0lBQ3hDLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQztJQUMzQixJQUFJLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFDN0IsS0FBSyxNQUFNLENBQUMsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUM3QixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQixNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEtBQUsscUJBQXFCLElBQUksQ0FBQyxDQUFDLFNBQVMsS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUMxRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixDQUFDO0lBQ0gsQ0FBQztJQUNELElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUMzQixPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBQ0QsT0FBTyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDcEMsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLEtBQVk7SUFDL0IsTUFBTSxTQUFTLEdBQXVCLEVBQUUsQ0FBQztJQUN6QyxTQUFTLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRTtRQUMxQixlQUFlO1FBQ2YsWUFBWTtRQUNaLGNBQWM7UUFDZCxNQUFNO1FBQ04saUJBQWlCO1FBQ2pCLGlCQUFpQjtRQUNqQixZQUFZO1FBQ1osZUFBZTtRQUNmLE9BQU87UUFDUCxhQUFhO1FBQ2IsVUFBVTtRQUNWLGFBQWE7UUFDYixNQUFNO1FBQ04sZ0JBQWdCO1FBQ2hCLFVBQVU7UUFDVixTQUFTO1FBQ1QsVUFBVTtRQUNWLGFBQWE7UUFDYixXQUFXO1FBQ1gsT0FBTztLQUNSLENBQUMsQ0FBQztJQUNILFNBQVMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7SUFDMUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7SUFDN0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNwQixTQUFTLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRCxPQUFPLFNBQXNCLENBQUM7QUFDaEMsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLFlBQTJCO0lBQy9DLE1BQU0sUUFBUSxHQUF5QixFQUFFLENBQUM7SUFDMUMsS0FBSyxNQUFNLEVBQUUsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUM5QixNQUFNLEtBQUssR0FBdUIsRUFBRSxDQUFDO1FBQ3JDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFO1lBQ25CLFNBQVM7WUFDVCxhQUFhO1lBQ2IsWUFBWTtZQUNaLFNBQVM7WUFDVCxPQUFPO1lBQ1AsU0FBUztZQUNULFNBQVM7WUFDVCxTQUFTO1NBQ1YsQ0FBQyxDQUFDO1FBQ0gsS0FBSyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDO1FBQ3pCLEtBQUssQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQztRQUNwQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQWMsQ0FBQyxHQUFHLEtBQWtCLENBQUM7SUFDdEQsQ0FBQztJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxLQUFZLEVBQUUsU0FBb0I7SUFDckQsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDbkIsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQUNELElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQzVCLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxRQUFRLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN4QixLQUFLLFlBQVksQ0FBQztRQUNsQixLQUFLLGNBQWMsQ0FBQztRQUNwQixLQUFLLGNBQWM7WUFDakIsT0FBTyxZQUFZLENBQUM7UUFDdEI7WUFDRSxPQUFPLFFBQVEsQ0FBQztJQUNwQixDQUFDO0FBQ0gsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQVMsYUFBYSxDQUNwQixTQUFrQyxFQUNsQyxXQUFzQyxFQUN0QyxLQUFzQixFQUN0QixLQUFzQjtJQUV0QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1FBQ3pELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEMsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNULElBQUEsMkJBQVksRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3BDLE9BQU8sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLElBQUksK0JBQStCLENBQUMsQ0FBQztRQUNyRSxDQUFDO2FBQU0sQ0FBQztZQUNOLE9BQU8sQ0FBQyxLQUFLLENBQ1gsWUFBWSxRQUFRLGtCQUFrQixRQUFRLENBQUMsUUFBUSw4QkFBOEIsQ0FDdEYsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0lBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztRQUN2RCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNULElBQUEscUJBQVMsRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdEIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksVUFBVSxDQUFDLENBQUM7UUFDdkMsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLENBQUMsS0FBSyxDQUNYLHlCQUF5QixJQUFJLGlEQUFpRCxDQUMvRSxDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxRQUFRLENBQ2YsS0FBcUIsRUFDckIsVUFBa0IsRUFDbEIsR0FBVyxFQUNYLFlBQW9CO0lBRXBCLElBQUksVUFBVSxHQUFHLFVBQVUsR0FBRyxZQUFZLEdBQUcsR0FBRyxDQUFDO0lBQ2pELElBQUEsY0FBUyxFQUFDLFVBQVUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBRTNDOztPQUVHO0lBQ0gsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO0lBQy9CLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDakQsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQixNQUFNLFFBQVEsR0FBRyxVQUFVLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQztRQUMzQyxJQUFBLGtCQUFhLEVBQ1gsUUFBUSxFQUNSLGFBQWEsR0FBRywyQ0FBMkMsSUFBSSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQ3ZHLENBQUM7UUFDRixJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsR0FBRywyQkFBMkIsQ0FBQyxDQUFDO0lBQ2xFLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxFQUFFLENBQUM7UUFDN0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksY0FBYyxZQUFZLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsc0JBQXNCO0lBQ3RCLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLFlBQVksZUFBZSxHQUFHLE9BQU8sQ0FBQyxDQUFDO0lBQ2hFLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxFQUFFLENBQUM7UUFDN0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUNELENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFZixNQUFNLFFBQVEsR0FBRyxVQUFVLEdBQUcsWUFBWSxHQUFHLEtBQUssQ0FBQztJQUNuRCxJQUFBLGtCQUFhLEVBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN0QyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakIsQ0FBQyJ9