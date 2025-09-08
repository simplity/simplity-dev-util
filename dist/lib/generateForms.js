"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateForms = generateForms;
function generateForms(records, forms) {
    let nbrErrors = 0;
    for (const [name, record] of Object.entries(records.all)) {
        if (!record.isVisibleToClient) {
            console.warn(`Warning: Record ${name} is not visible to the client-side. Form not created.`);
            continue;
        }
        let childRecords;
        let sr = records.simple[name];
        if (!sr) {
            /**
             * this is a composite record. We create form for the main form as a simple record first
             */
            const cr = record;
            childRecords = cr.childRecords;
            const ref = records.simple[cr.mainRecordName];
            if (ref === undefined) {
                console.error(`Error: Composite/extended Record "${name}" has mainRecord="${cr.mainRecordName}" but that record is not defined, or is a composite-record. Source NOT generated`);
                nbrErrors++;
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
    return nbrErrors;
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
function copyAttrs(fromObj, toObj, attrs) {
    for (const attr of attrs) {
        const value = fromObj[attr];
        if (value !== undefined) {
            toObj[attr] = value;
        }
    }
}
//# sourceMappingURL=generateForms.js.map