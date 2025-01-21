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
        'label',
        'listKeyFieldName',
        'listKeyName',
        'listKeyValue',
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
        }
    }
    panel.children = children;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0NvbXBvbmVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3Byb2Nlc3NDb21wb25lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQTh0QkEsMENBZ0JDO0FBOXVCRCwyQkFBc0Q7QUEwQnRELGlEQUE4QztBQUM5QywyQ0FBd0M7QUFDeEMsdURBQW9EO0FBMkJ2QyxRQUFBLE9BQU8sR0FBRztJQUNyQjs7Ozs7Ozs7Ozs7O09BWUc7SUFDSCxpQkFBaUI7Q0FDbEIsQ0FBQztBQUVGLFNBQVMsaUJBQWlCLENBQ3hCLFFBQW1CLEVBQ25CLFVBQWtCLEVBQ2xCLFFBQWdCO0lBRWhCOztPQUVHO0lBQ0gsSUFBQSxXQUFNLEVBQUMsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNyRCxJQUFBLGNBQVMsRUFBQyxVQUFVLENBQUMsQ0FBQztJQUV0QixJQUFBLFdBQU0sRUFBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ25ELElBQUEsY0FBUyxFQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRXBCOztPQUVHO0lBQ0gsSUFBSSxRQUFRLEdBQUcsVUFBVSxHQUFHLGtCQUFrQixDQUFDO0lBQy9DLE1BQU0sT0FBTyxHQUFZO1FBQ3ZCLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSTtRQUN0QixxQkFBcUIsRUFBRSxRQUFRLENBQUMscUJBQXFCO1FBQ3JELGVBQWUsRUFBRSxRQUFRLENBQUMsZUFBZTtRQUN6QyxjQUFjLEVBQUUsUUFBUSxDQUFDLGNBQWM7S0FDeEMsQ0FBQztJQUNGLElBQUEsa0JBQWEsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2pELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUVmLG1C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