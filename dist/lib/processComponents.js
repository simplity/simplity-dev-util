"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devUtil = void 0;
exports.checkValueLists = checkValueLists;
const fs_1 = require("fs");
const generatePage_1 = require("./generatePage");
const alterPage_1 = require("./alterPage");
const systemResources_1 = require("./systemResources");
exports.devUtil = {
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
    processComponents,
};
function processComponents(appComps, jsonFolder, tsFolder) {
    /**
     * clean-p folders that we are going to generate to
     */
    (0, fs_1.rmSync)(jsonFolder, { recursive: true, force: true });
    (0, fs_1.mkdirSync)(jsonFolder);
    (0, fs_1.rmSync)(tsFolder, { recursive: true, force: true });
    (0, fs_1.mkdirSync)(tsFolder);
    /**
     * 1. application.json
     */
    let fileName = jsonFolder + 'application.json';
    const appJson = {
        appName: appComps.name,
        maxLengthForTextField: appComps.maxLengthForTextField,
        tenantFieldName: appComps.tenantFieldName,
        tenantNameInDb: appComps.tenantNameInDb,
    };
    (0, fs_1.writeFileSync)(fileName, JSON.stringify(appJson));
    done(fileName);
    //let allOK = true;
    /**
     * 2. valueLists.json
     */
    fileName = jsonFolder + 'valueLists.json';
    (0, fs_1.writeFileSync)(fileName, JSON.stringify({
        valueLists: { ...systemResources_1.systemResources.valueLists, ...appComps.valueLists },
    }));
    done(fileName);
    /**
     * 3. messages.json
     */
    fileName = jsonFolder + 'messages.json';
    (0, fs_1.writeFileSync)(fileName, JSON.stringify({
        messages: { ...systemResources_1.systemResources.messages, ...appComps.messages },
    }));
    done(fileName);
    /**
     * 4. valueSchemas.json
     */
    fileName = jsonFolder + 'valueSchemas.json';
    (0, fs_1.writeFileSync)(fileName, JSON.stringify({
        valueSchemas: {
            ...systemResources_1.systemResources.valueSchemas,
            ...appComps.valueSchemas,
        },
    }));
    done(fileName);
    /**
     * records are quite clumsy as of now because of the mismatch between the way the server and the client use the terms "forms" and "records".
     * This needs some serious re-factoring
     *
     * Note: framework requires some records
     */
    const comps = {
        all: { ...systemResources_1.systemResources.records, ...appComps.records },
        forms: {},
        simpleRecords: {},
        wrongOnes: {},
    };
    organizeRecords(comps);
    /**
     * 5. records.json
     * we will write the converted ones. Java generator need not handle 'extended' records...
     */
    writeJsons(jsonFolder, 'rec', { ...comps.all, ...comps.simpleRecords });
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
    //forms are needed for us to generate pages
    const forms = {};
    generateForms(comps, forms);
    writeAll(forms, tsFolder, 'Form', 'forms');
    /**
     * 10. pages.ts from /template/*.ts and alter /pageAlterations
     */
    const pages = appComps.pages || {};
    const n = modifyPanels(pages, forms);
    if (n > 0) {
        console.error(`\n\n${n} ERROR: errors found in the pages. Generated Pages may not be usable!!`);
    }
    generatePages(appComps.templates || {}, appComps.pageAlterations || {}, forms, pages);
    writeAll(pages, tsFolder, 'Page', 'pages');
}
function done(fileName) {
    console.info(`file ${fileName} created.`);
}
function organizeRecords(comps) {
    for (const [name, record] of Object.entries(comps.all)) {
        const rt = record.recordType;
        if (rt === 'composite') {
            comps.forms[name] = record;
        }
        else if (rt === 'simple') {
            comps.simpleRecords[name] = record;
        }
        else {
            //we have to extend it. Let us do it later
        }
    }
    //extend all the "extended" records
    for (const record of Object.values(comps.all)) {
        if (record.recordType === 'extended') {
            //convert it to simple and add it to records collection
            toSimpleRecord(record, comps, []);
        }
    }
}
/**
 * convert the extended record to simple record, and add it to the records collections
 * @returns new simple record that is already added to the records collection
 */
function toSimpleRecord(record, comps, dependencies) {
    const recordName = record.name;
    const sr = comps.simpleRecords[recordName];
    if (sr) {
        //already converted and put to records. This happens if it was a main-record for another extended record
        return sr;
    }
    if (comps.wrongOnes[recordName]) {
        //already detected as a problematic one
        return undefined;
    }
    const mainRecordName = record.mainRecordName;
    if (recordName === mainRecordName) {
        console.error(`ERROR: Extended ${recordName} has set itself as its mainRecord!! `);
        comps.wrongOnes[recordName] = true;
        return undefined;
    }
    //are we getting into an infinite loop?
    const idx = dependencies.indexOf(recordName);
    if (idx !== -1) {
        console.error(`ERROR: Record ${recordName} is an extended record, but has a cyclical/recursive dependency on itself`);
        const t = dependencies.slice(idx);
        t.push(recordName);
        console.error(t.join(' --> '));
        //actually, all the entries are wrong ones, but we will anyway go through them as the recursive function returns...
        comps.wrongOnes[recordName] = true;
        return undefined;
    }
    let mainRecord = comps.simpleRecords[mainRecordName];
    if (!mainRecord) {
        mainRecord = comps.all[mainRecordName];
        if (mainRecord === undefined) {
            console.error(`Extended record ${recordName} uses mainRecordName="${mainRecordName}", but that record is not defined`);
            comps.wrongOnes[recordName] = true;
            return undefined;
        }
        if (mainRecord.recordType === 'composite') {
            console.error(`Extended record ${recordName} uses mainRecordName="${mainRecordName}", but that is a form/composite-record`);
            comps.wrongOnes[recordName] = true;
            return undefined;
        }
        /**
         * recurse to get the main-record converted first
         */
        dependencies.push(recordName);
        mainRecord = toSimpleRecord(mainRecord, comps, dependencies);
        dependencies.pop();
        if (!mainRecord) {
            comps.wrongOnes[recordName] = true;
            return undefined;
        }
    }
    const newRecord = extendIt(record, mainRecord);
    if (!newRecord) {
        comps.wrongOnes[recordName] = true;
        return undefined;
    }
    comps.simpleRecords[recordName] = newRecord;
    return newRecord;
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
                console.error(`ERROR: Extended record ${recordToExtend.name} specifies ${fieldName} as a reference field but that field is not defined in the reference record ${ref.name}. Field skipped`);
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
        let childRecords;
        let sr = comps.simpleRecords[name];
        if (!sr) {
            /**
             * this is a composite record. We create form for the main form as a simple record first
             */
            const cr = record;
            childRecords = cr.childRecords;
            const ref = comps.simpleRecords[cr.mainRecordName];
            if (ref === undefined) {
                console.error(`Composite/extended Record "${name}" has mainRecord="${cr.mainRecordName}" but that record is not defined, or is a composite-record. Source NOT generated`);
                continue;
            }
            const temp = { ...cr };
            delete temp.childForms;
            temp.fields = ref.fields;
            sr = temp;
        }
        const form = toForm(sr);
        if (childRecords) {
            form.childForms = toChildForms(childRecords);
        }
        console.info(`FORM '${name}' added to the forms collection`);
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
        'customHtml',
        'defaultValue',
        'filterable',
        'formattingFn',
        'hideInList',
        'hideInSave',
        'hint',
        'icon',
        'imageNamePrefix',
        'imageNameSuffix',
        'isArray',
        'label',
        'labelAttributes',
        'listKeyFieldName',
        'listKeyValue',
        'listName',
        'listOptions',
        'name',
        'messageId',
        'onBeingChanged',
        'onChange',
        'onClick',
        'placeHolder',
        'prefix',
        'sortable',
        'suffix',
        'renderAs',
        'valueFormatter',
        'valueSchema',
        'valueType',
        'width',
    ]);
    dataField.isRequired = toIsRequired(field.fieldType);
    dataField.compType = 'field';
    if (!field.renderAs) {
        dataField.renderAs = getRenderAs(field, field.valueType);
    }
    return dataField;
}
function toIsRequired(ft) {
    return (ft === 'generatedPrimaryKey' || ft === 'primaryKey' || ft === 'requiredData');
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
        child.name = cr.childName;
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
 * go through pages, alert any errors, and expand fields ina panel if required before copying it the new collection
 * @param pages
 */
function modifyPanels(pages, forms) {
    let n = 0;
    for (const page of Object.values(pages)) {
        const form = page.formName ? forms[page.formName] : undefined;
        n += modifyPanel(page.dataPanel, form, forms, page.name);
    }
    return n;
}
function modifyPanel(panel, form, forms, pageName) {
    let n = 0;
    if (panel.childFormName) {
        form = forms[panel.childFormName];
        if (!form) {
            console.error(`Page '${pageName}': Panel ${panel.name} refers to form '${panel.childFormName}' but that form is not defined`);
            return 1;
        }
    }
    if (panel.children && panel.fieldNames) {
        console.error(`Page '${pageName}': Panel ${panel.name} defines both children and fieldNames. Note that fieldNames is to be used in leu of children, if fields are to be rendered from the associated form`);
        return 1;
    }
    const children = [];
    // do we need to generate child components based on form fields?
    if (panel.fieldNames) {
        if (!form) {
            console.error(`Page '${pageName}': Panel ${panel.name} defines fieldName, but no form is associated with this page.`);
            return 1;
        }
        const names = panel.fieldNames === 'all' ? form.fieldNames : panel.fieldNames;
        for (const fieldName of names) {
            const f = form.fields[fieldName];
            if (f) {
                children.push(f);
            }
            else {
                console.error(`Page ${pageName}: Panel ${panel.name} specifies '${fieldName}' as one of the fields but that field is not defined in the associated form '${form.name}' `);
                n++;
            }
        }
        panel.children = children;
        return n;
    }
    //either fieldNames or children. Hence panel.children will be non-null
    for (const child of panel.children) {
        if (child.compType === 'referred') {
            if (form) {
                const f = form.fields[child.name];
                if (f) {
                    //we start with the form field, override with whatever is specified by this child, and then restore the compType to 'field'
                    children.push({ ...f, ...child, compType: 'field' });
                }
                else {
                    console.error(`Page: ${pageName}: Panel ${panel.name} specifies '${child.name}' as a referred field but that field is not defined in the associated form '${form.name}' `);
                    n++;
                }
            }
            else {
                console.error(`Page: ${pageName}: Panel ${panel.name} specifies '${child.name}' as a referred field but no form is associated with this page.`);
                n++;
            }
            continue;
        }
        children.push(child);
        if (child.compType === 'panel') {
            n += modifyPanel(child, form, forms, pageName);
            continue;
        }
        if (child.compType === 'table') {
            const form = child.formName ? forms[child.formName] : undefined;
            n += modifyTable(child, form);
        }
    }
    panel.children = children;
    return n;
}
function modifyTable(table, form) {
    let n = 0;
    const children = table.children;
    if (!children || !children.length) {
        return 0;
    }
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.compType !== 'referred') {
            continue;
        }
        if (!form) {
            console.error(`Field ${child.name} is a referred field, but the page or the enclosing panel does not specify a form`);
            n++;
            continue;
        }
        let f = form.fields[child.name];
        if (f) {
            children[i] = { ...f, ...child, compType: 'field' };
            continue;
        }
        console.error(`Field ${child.name} is a referred field, but the form ${form.name} has no field with that name`);
        n++;
    }
    return n;
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
function checkValueLists(lists) {
    let n = 0;
    for (const [name, list] of Object.entries(lists)) {
        if (name === '') {
            console.error(`EMpty string as name found in file valueLists.ts.`);
            n++;
        }
        if (name !== list.name) {
            console.error(`Value list with name='${list.name}' is indexed as '${name}' in the file valueLists.ts. Value list must be indexed as its name`);
            n++;
        }
    }
    return n;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0NvbXBvbmVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3Byb2Nlc3NDb21wb25lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQXcxQkEsMENBZ0JDO0FBeDJCRCwyQkFBc0Q7QUE2QnRELGlEQUE4QztBQUM5QywyQ0FBd0M7QUFDeEMsdURBQW9EO0FBMkJ2QyxRQUFBLE9BQU8sR0FBRztJQUNyQjs7Ozs7Ozs7Ozs7O09BWUc7SUFDSCxpQkFBaUI7Q0FDbEIsQ0FBQztBQUVGLFNBQVMsaUJBQWlCLENBQ3hCLFFBQW1CLEVBQ25CLFVBQWtCLEVBQ2xCLFFBQWdCO0lBRWhCOztPQUVHO0lBQ0gsSUFBQSxXQUFNLEVBQUMsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNyRCxJQUFBLGNBQVMsRUFBQyxVQUFVLENBQUMsQ0FBQztJQUV0QixJQUFBLFdBQU0sRUFBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ25ELElBQUEsY0FBUyxFQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRXBCOztPQUVHO0lBQ0gsSUFBSSxRQUFRLEdBQUcsVUFBVSxHQUFHLGtCQUFrQixDQUFDO0lBQy9DLE1BQU0sT0FBTyxHQUFZO1FBQ3ZCLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSTtRQUN0QixxQkFBcUIsRUFBRSxRQUFRLENBQUMscUJBQXFCO1FBQ3JELGVBQWUsRUFBRSxRQUFRLENBQUMsZUFBZTtRQUN6QyxjQUFjLEVBQUUsUUFBUSxDQUFDLGNBQWM7S0FDeEMsQ0FBQztJQUNGLElBQUEsa0JBQWEsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2pELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUVmLG1C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