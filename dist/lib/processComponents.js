import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { generatePage } from './generatePage';
import { alterPage } from './alterPage';
import { systemResources } from './systemResources';
export const devUtil = {
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
    rmSync(jsonFolder, { recursive: true, force: true });
    mkdirSync(jsonFolder);
    rmSync(tsFolder, { recursive: true, force: true });
    mkdirSync(tsFolder);
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
    writeFileSync(fileName, JSON.stringify(appJson));
    done(fileName);
    //let allOK = true;
    /**
     * 2. valueLists.json
     */
    fileName = jsonFolder + 'valueLists.json';
    writeFileSync(fileName, JSON.stringify({
        valueLists: { ...systemResources.valueLists, ...appComps.valueLists },
    }));
    done(fileName);
    /**
     * 3. messages.json
     */
    fileName = jsonFolder + 'messages.json';
    writeFileSync(fileName, JSON.stringify({
        messages: { ...systemResources.messages, ...appComps.messages },
    }));
    done(fileName);
    /**
     * 4. valueSchemas.json
     */
    fileName = jsonFolder + 'valueSchemas.json';
    writeFileSync(fileName, JSON.stringify({
        valueSchemas: {
            ...systemResources.valueSchemas,
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
        all: { ...systemResources.records, ...appComps.records },
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
    const n = processPages(pages, forms);
    if (n > 0) {
        console.error(`${n} Error: errors found in the pages. Generated Pages may not be usable!!`);
        process.exit(1);
    }
    generatePages(appComps.templates || {}, appComps.pageAlterations || {}, forms, pages);
    writeAll(pages, tsFolder, 'Page', 'pages');
}
function done(_fileName) {
    //console.info(`file ${fileName} created.`);
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
        console.error(`Error: Extended ${recordName} has set itself as its mainRecord!! `);
        comps.wrongOnes[recordName] = true;
        return undefined;
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
        return undefined;
    }
    let mainRecord = comps.simpleRecords[mainRecordName];
    if (!mainRecord) {
        mainRecord = comps.all[mainRecordName];
        if (mainRecord === undefined) {
            console.error(`Error: Extended record ${recordName} uses mainRecordName="${mainRecordName}", but that record is not defined`);
            comps.wrongOnes[recordName] = true;
            return undefined;
        }
        if (mainRecord.recordType === 'composite') {
            console.error(`Error: Extended record ${recordName} uses mainRecordName="${mainRecordName}", but that is a form/composite-record`);
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
    mkdirSync(folder);
    for (const [name, comp] of Object.entries(comps)) {
        if (name !== comp.name) {
            console.error(`Error: Component with name='${comp.name}' is indexed with key='${name}. This is incorrect. Name should match the indexed-key to ensure that the name is unique across all records\n json NOT created for this record`);
            continue;
        }
        const fileName = folder + name + '.' + typ + '.json';
        writeFileSync(fileName, JSON.stringify(comp));
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
    writeFileSync(fileName, str);
    done(fileName);
}
function generateForms(comps, forms) {
    for (const [name, record] of Object.entries(comps.all)) {
        if (!record.isVisibleToClient) {
            console.warn(`Warning: Record ${name} is not visible to the client-side. Form not created.`);
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
                console.error(`Error: Composite/extended Record "${name}" has mainRecord="${cr.mainRecordName}" but that record is not defined, or is a composite-record. Source NOT generated`);
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
 * go through pages, alert any errors, and expand fields in a panel if required before copying it the new collection
 * @param pages
 */
function processPages(pages, forms) {
    let n = 0;
    for (const page of Object.values(pages)) {
        let form;
        if (page.formName) {
            form = forms[page.formName];
            if (!form) {
                console.error(`Error: Page '${page.name}: Form ${page.formName} is not a valid form name`);
                n++;
            }
        }
        n += processPanel(page.dataPanel, form, forms, page.name);
    }
    return n;
}
function processPanel(panel, form, forms, pageName) {
    let n = 0;
    if (panel.childFormName) {
        form = forms[panel.childFormName];
        if (!form) {
            console.error(`Error: Page '${pageName}': Panel ${panel.name} refers to form '${panel.childFormName}' but that form is not defined`);
            n++;
        }
    }
    const children = [];
    // start with any fields selected from the associated form
    if (panel.fieldNames) {
        if (!form) {
            console.error(`Error: Page '${pageName}': Panel ${panel.name} defines fieldName, but no form is associated with this page.`);
            return 1;
        }
        const names = panel.fieldNames === 'all' ? form.fieldNames : panel.fieldNames;
        for (const fieldName of names) {
            const f = form.fields[fieldName];
            if (f) {
                children.push(f);
            }
            else {
                console.error(`Error: Page ${pageName}: Panel ${panel.name} specifies '${fieldName}' as one of the fields but that field is not defined in the associated form '${form.name}' `);
                n++;
            }
        }
    }
    if (panel.children) {
        for (const child of panel.children) {
            if (child.compType === 'referred') {
                if (form) {
                    const f = form.fields[child.name];
                    if (f) {
                        //we start with the form field, override with whatever is specified by this child, and then restore the compType to 'field'
                        children.push({ ...f, ...child, compType: 'field' });
                    }
                    else {
                        console.error(`Error: Page: ${pageName}: Panel ${panel.name} specifies '${child.name}' as a referred field but that field is not defined in the associated form '${form.name}' `);
                        n++;
                    }
                }
                else {
                    console.error(`Error: Page: ${pageName}: Panel ${panel.name} specifies '${child.name}' as a referred field but no form is associated with this page.`);
                    n++;
                }
                continue;
            }
            children.push(child);
            if (child.compType === 'panel') {
                n += processPanel(child, form, forms, pageName);
                continue;
            }
            if (child.compType === 'table') {
                const table = child;
                const form = table.formName ? forms[table.formName] : undefined;
                n += processTable(table, form, pageName);
            }
        }
    }
    panel.children = children;
    return n;
}
function processTable(table, form, pageName) {
    const hasColumns = !table.editable && !!table.columns;
    let children = table.children;
    if (children && children.length) {
        if (hasColumns) {
            console.warn(`Warning: Page: ${pageName} Table '${table.name}': Both children and columns are specified. Columns ignored.`);
        }
        return processFields(children, form, pageName);
    }
    if (hasColumns) {
        return 0;
    }
    if (!form) {
        console.warn(`Warn: Page: ${pageName} Table '${table.name}': Neither formName nor children/columns specified. Field names will be used as column headers.`);
        return 0;
    }
    /**
     * all fields from the form are to be treated as children
     */
    children = [];
    for (const fieldName of form.fieldNames) {
        const field = form.fields[fieldName];
        children.push({ ...field, compType: 'field' });
    }
    table.children = children;
    return 0;
}
function processFields(children, form, pageName) {
    /**
     * take care of any referred fields
     */
    let n = 0;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.compType !== 'referred') {
            continue;
        }
        if (!form) {
            console.error(`Error: Page: ${pageName} Field ${child.name} is a referred field, but the page or the enclosing panel does not specify a form`);
            n++;
            continue;
        }
        let f = form.fields[child.name];
        if (f) {
            children[i] = { ...f, ...child, compType: 'field' };
            continue;
        }
        console.error(`Error: Page: ${pageName} Field ${child.name} is a referred field, but the form ${form.name} has no field with that name`);
        n++;
    }
    return n;
}
/**
 * generated pages are written to a separate folder, and the run time system uses these generated pages rather than the ones written by the programmer
 */
function generatePages(templates, alterations, forms, pages) {
    for (const [name, template] of Object.entries(templates)) {
        const form = forms[template.formName];
        if (form) {
            generatePage(template, form, pages);
            //console.info(`page template ${name} processed to generate ${n} page/s`);
        }
        else {
            console.error(`Error: Template ${name}:  Form ${template.formName} is not defined`);
        }
    }
    for (const [name, alts] of Object.entries(alterations)) {
        const page = pages[name];
        if (page) {
            alterPage(page, alts);
            //console.info(`page ${name} altered`);
        }
        else {
            console.error(`Error: Alteration for Page ${name}:  Alterations specified, but that page is not defined`);
        }
    }
}
function writeAll(comps, rootFolder, typ, allCompsName) {
    let folderName = rootFolder + allCompsName + '/';
    mkdirSync(folderName, { recursive: true });
    /**
     * write individual files in the sub-folder
     */
    const compNames = [];
    for (const [name, comp] of Object.entries(comps)) {
        compNames.push(name);
        const fileName = folderName + name + '.ts';
        writeFileSync(fileName, `import {  ${typ} } from 'simplity-types';\nexport const ${name}: ${typ} = ${JSON.stringify(comp)};\n`);
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
    writeFileSync(fileName, t.join('\n'));
    done(fileName);
}
export function checkValueLists(lists) {
    let n = 0;
    for (const [name, list] of Object.entries(lists)) {
        if (name === '') {
            console.error(`Error: Empty string as name found in file valueLists.ts.`);
            n++;
        }
        if (name !== list.name) {
            console.error(`Error: Value list with name='${list.name}' is indexed as '${name}' in the file valueLists.ts. Value list must be indexed as its name`);
            n++;
        }
    }
    return n;
}
//# sourceMappingURL=processComponents.js.map