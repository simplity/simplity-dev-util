"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.process = process;
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
function process(appComps, jsonFolder, tsFolder) {
    (0, fs_1.rmSync)(jsonFolder, { recursive: true, force: true });
    (0, fs_1.mkdirSync)(jsonFolder);
    (0, fs_1.rmSync)(tsFolder, { recursive: true, force: true });
    (0, fs_1.mkdirSync)(tsFolder);
    let fileName = jsonFolder + 'application.json';
    const appJson = {
        appName: appComps.name,
        maxLengthForTextField: appComps.maxLengthForTextField,
        tenantFieldName: appComps.tenantFieldName,
        tenantNameInDb: appComps.tenantNameInDb,
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
        valueLists: { ...simplity_types_1.systemResources.valueLists, ...appComps.valueLists },
    }));
    done(fileName);
    /**
     * 3. messages.json
     */
    fileName = jsonFolder + 'messages.json';
    (0, fs_1.writeFileSync)(fileName, JSON.stringify({
        messages: { ...simplity_types_1.systemResources.messages, ...appComps.messages },
    }));
    done(fileName);
    /**
     * 4. valueSchemas.json
     */
    fileName = jsonFolder + 'valueSchemas.json';
    (0, fs_1.writeFileSync)(fileName, JSON.stringify({
        valueSchemas: {
            ...simplity_types_1.systemResources.valueSchemas,
            ...appComps.valueSchemas,
        },
    }));
    done(fileName);
    /**
     * records are quite clumsy as of now because of the mismatch between the way the server and the client use the terms "forms" and "records".
     * This needs some serious re-factoring
     */
    const comps = {
        all: { ...simplity_types_1.systemResources.records, ...appComps.records },
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
    writeJsons(jsonFolder, 'sql', appComps.sqls || {});
    /**
     * done with server side. Let's now generate .ts files
     */
    /**
     * 8. listSources.ts
     */
    generateListSources(appComps.valueLists, tsFolder);
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
    const pages = { ...(appComps.pages || {}) };
    generatePages(appComps.templates || {}, appComps.pageAlterations || {}, forms, pages);
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
            const n = (0, generatePage_1.generatePage)(template, form, pages);
            console.info(`page template ${name} processed to generate ${n} page/s`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50UHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9jb21wb25lbnRQcm9jZXNzb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFtRUEsMEJBcUhDO0FBeExELDJCQUFzRDtBQUN0RCxtREF1QndCO0FBQ3hCLGlEQUE4QztBQUM5QywyQ0FBd0M7QUE0QnhDOzs7Ozs7Ozs7Ozs7R0FZRztBQUNILFNBQWdCLE9BQU8sQ0FDckIsUUFBMEIsRUFDMUIsVUFBa0IsRUFDbEIsUUFBZ0I7SUFFaEIsSUFBQSxXQUFNLEVBQUMsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNyRCxJQUFBLGNBQVMsRUFBQyxVQUFVLENBQUMsQ0FBQztJQUV0QixJQUFBLFdBQU0sRUFBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ25ELElBQUEsY0FBUyxFQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRXBCLElBQUksUUFBUSxHQUFHLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQztJQUMvQyxNQUFNLE9BQU8sR0FBWTtRQUN2QixPQUFPLEVBQUUsUUFBUSxDQUFDLElBQUk7UUFDdEIscUJBQXFCLEVBQUUsUUFBUSxDQUFDLHFCQUFxQjtRQUNyRCxlQUFlLEVBQUUsUUFBUSxDQUFDLGVBQWU7UUFDekMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxjQUFjO0tBQ3hDLENBQUM7SUFDRjs7T0FFRztJQUNILElBQUEsa0JBQWEsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2pELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUVmOztPQUVHO0lBQ0gsUUFBUSxHQUFHLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQztJQUMxQyxJQUFBLGtCQUFh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