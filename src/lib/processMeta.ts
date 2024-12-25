import { mkdirSync, rmSync, writeFileSync } from 'fs';
import {
  AppMeta,
  ChildForm,
  ChildRecord,
  CompositeRecord,
  DataField,
  ExtendedRecord,
  Field,
  FieldRendering,
  FixedKeyedList,
  FixedList,
  Form,
  ListSource,
  Page,
  PageAlteration,
  PageTemplate,
  Record,
  SimpleRecord,
  StringMap,
  systemResources,
  ValidFormOperations,
  ValueList,
  ValueType,
} from 'simplity-types';
import { generatePage } from './generatePage';
import { alterPage } from './alterPage';

/**
 * attributes for application.json
 */
type AppJson = {
  appName: string;
  maxLengthForTextField?: number;
  tenantFieldName?: string;
  tenantNameInDb?: string;
};

type AllRecords = {
  all: StringMap<Record>;
  /**
   * simple/extended records
   */
  records: StringMap<SimpleRecord>;
  /**
   * composite Records: called as clientForm by the server
   */
  forms: StringMap<CompositeRecord>;
  /**
   * names of extended records that failed the conversion process
   */
  wrongOnes: StringMap<true>;
};

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
export function processMeta(
  meta: AppMeta,
  jsonFolder: string,
  tsFolder: string
) {
  rmSync(jsonFolder, { recursive: true, force: true });
  mkdirSync(jsonFolder);

  rmSync(tsFolder, { recursive: true, force: true });
  mkdirSync(tsFolder);

  let fileName = jsonFolder + 'application.json';
  const appJson: AppJson = {
    appName: meta.name,
    maxLengthForTextField: meta.maxLengthForTextField,
    tenantFieldName: meta.tenantFieldName,
    tenantNameInDb: meta.tenantNameInDb,
  };
  /**
   * 1. application.json
   */
  writeFileSync(fileName, JSON.stringify(appJson));
  done(fileName);

  /**
   * 2. valueLists.json
   */
  fileName = jsonFolder + 'valueLists.json';
  writeFileSync(
    fileName,
    JSON.stringify({
      valueLists: { ...systemResources.valueLists, ...meta.valueLists },
    })
  );
  done(fileName);

  /**
   * 3. messages.json
   */
  fileName = jsonFolder + 'messages.json';
  writeFileSync(
    fileName,
    JSON.stringify({
      messages: { ...systemResources.messages, ...meta.messages },
    })
  );
  done(fileName);

  /**
   * 4. valueSchemas.json
   */
  fileName = jsonFolder + 'valueSchemas.json';
  writeFileSync(
    fileName,
    JSON.stringify({
      valueSchemas: {
        ...systemResources.valueSchemas,
        ...meta.valueSchemas,
      },
    })
  );
  done(fileName);

  /**
   * records are quite clumsy as of now because of the mismatch between the way the server and the client use the terms "forms" and "records".
   * This needs some serious re-factoring
   */
  const comps: AllRecords = {
    all: { ...systemResources.records, ...meta.records },
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
  const forms: StringMap<Form> = {};
  generateForms(comps, forms);
  writeAll(forms, tsFolder, 'Form', 'forms');

  /**
   * 10. pages.ts from /template/*.ts and alter /pageAlterations
   */
  const pages: StringMap<Page> = { ...(meta.pages || {}) };
  generatePages(meta.templates || {}, meta.pageAlterations || {}, forms, pages);
  writeAll(pages, tsFolder, 'Page', 'pages');
}

function done(fileName: string): void {
  console.info(`file ${fileName} created.`);
}

function organizeRecords(comps: AllRecords): void {
  for (const [name, record] of Object.entries(comps.all)) {
    if (record.recordType === 'composite') {
      comps.forms[name] = record;
    } else if (record.recordType === 'simple') {
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

function toSimpleRecord(
  record: ExtendedRecord,
  comps: AllRecords,
  dependencies: string[]
): SimpleRecord | undefined {
  const name = record.name;

  if (comps.wrongOnes[name]) {
    //already detected
    return undefined;
  }

  //are we getting into an infinite loop?
  const idx = dependencies.indexOf(name);
  if (idx !== -1) {
    console.error(
      `Record ${name} is an extended record, but has a recursive dependency on itself`
    );
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
    console.error(
      `Extended record ${name} uses mainRecordName="${mainRecordName}", but that record is not defined`
    );
    comps.wrongOnes[name] = true;
    return undefined;
  }

  if (mainRecord.recordType === 'composite') {
    console.error(
      `Extended record ${name} uses mainRecordName="${mainRecordName}", but that is a form/composite-record`
    );
    comps.wrongOnes[name] = true;
    return undefined;
  }

  let refRecord: SimpleRecord | undefined;
  if (mainRecord.recordType === 'simple') {
    refRecord = mainRecord;
  } else {
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

function extendIt(record: ExtendedRecord, ref: SimpleRecord): SimpleRecord {
  const newRecord: StringMap<unknown> = {
    ...ref,
    ...record,
    recordType: 'simple',
  };

  if (record.fieldNames) {
    const fields: StringMap<Field> = {};
    for (const field of ref.fields) {
      fields[field.name] = field;
    }
    const newFields: Field[] = [];
    for (const fieldName of record.fieldNames) {
      const field = fields[fieldName];
      if (field) {
        newFields.push(field);
      } else {
        console.error(
          `Extended record ${record.name} specifies ${fieldName} as a reference field but that field is not defined in the reference record ${ref.name}. Field skipped`
        );
      }
    }
    newRecord.fields = newFields;
    delete newRecord.fieldNames;
  }

  if (record.additionalFields) {
    const fields = newRecord.fields as Field[];
    for (const field of record.additionalFields) {
      fields.push(field);
    }
    delete newRecord.additionalFields;
  }

  return newRecord as SimpleRecord;
}

function copyAttrs(
  fromObj: StringMap<unknown>,
  toObj: StringMap<unknown>,
  attrs: string[]
): void {
  for (const attr of attrs) {
    const value = fromObj[attr];
    if (value !== undefined) {
      toObj[attr] = value;
    }
  }
}

function writeJsons(
  jsonFolder: string,
  typ: string,
  comps: { [key: string]: any }
) {
  const folder = jsonFolder + typ + '/';
  mkdirSync(folder);
  for (const [name, comp] of Object.entries(comps)) {
    if (name !== comp.name!) {
      console.error(
        `Component with name='${comp.name}' is indexed with key='${name}. This is incorrect. Name should match the indexed-key to ensure that the name is unique across all records\n json NOT created for this record`
      );
      continue;
    }

    const fileName = folder + name + '.' + typ + '.json';
    writeFileSync(fileName, JSON.stringify(comp));
    done(fileName);
  }
}

function generateListSources(
  valueLists: StringMap<ValueList>,
  tsFolder: string
) {
  const listSources: StringMap<ListSource> = {};
  for (const [name, list] of Object.entries(valueLists)) {
    if (list.listType === 'simple') {
      listSources[name] = {
        name,
        isKeyed: false,
        isRuntime: false,
        okToCache: true,
        list: (list as FixedList).list,
      };
    } else if (list.listType === 'keyed') {
      listSources[name] = {
        name,
        isKeyed: true,
        isRuntime: false,
        okToCache: true,
        keyedList: (list as FixedKeyedList).keyedList,
      };
    }
  }
  const str =
    "import { StringMap, ListSource } from 'simplity-types';\nexport const listSources: StringMap<ListSource> = " +
    JSON.stringify(listSources) +
    ';\n';
  const fileName = tsFolder + 'listSources.ts';
  writeFileSync(fileName, str);
  done(fileName);
}

function generateForms(comps: AllRecords, forms: StringMap<Form>) {
  for (const [name, record] of Object.entries(comps.all)) {
    if (!record.isVisibleToClient) {
      console.info(
        `Record ${name} is not visible to the client-side. Form not created.`
      );
      continue;
    }

    let sr: SimpleRecord | undefined;
    let childRecords: ChildRecord[] | undefined;
    if (record.recordType === 'simple') {
      sr = record as SimpleRecord;
    } else if (record.recordType === 'extended') {
      sr = comps.records[name];
    } else {
      childRecords = record.childRecords;
      const ref = comps.records[record.mainRecordName];

      if (ref === undefined) {
        console.error(
          `Composite Record "${name}" has mainRecord="${record.mainRecordName}" but that record is not defined, or is a composite-record. Source NOT generated`
        );
        continue;
      }

      const temp: StringMap<unknown> = { ...record };
      delete temp.childForms;
      temp.fields = ref.fields;
      sr = temp as SimpleRecord;
    }

    const form = toForm(sr);
    if (childRecords) {
      form.childForms = toChildForms(childRecords);
    }
    forms[name] = form;
  }
}

function toForm(record: SimpleRecord): Form {
  const form: StringMap<unknown> = {};
  copyAttrs(record, form, [
    'name',
    //"operations",
    'serveGuests',
    'validationFn',
    'interFieldValidations',
    'childRecords',
  ]);

  if (record.operations !== undefined) {
    const ops: ValidFormOperations = {};
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

  return form as Form;
}

function toDataFields(
  recordFields: Field[]
): [StringMap<DataField>, string[], string[] | undefined] {
  const fields: StringMap<DataField> = {};
  const names: string[] = [];
  let keyFields: string[] = [];
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

function toDataField(field: Field): DataField {
  const dataField: StringMap<unknown> = {};
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

  return dataField as DataField;
}

function toChildForms(childRecords: ChildRecord[]): StringMap<ChildForm> {
  const children: StringMap<ChildForm> = {};
  for (const cr of childRecords) {
    const child: StringMap<unknown> = {};
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
    children[child.name as string] = child as ChildForm;
  }
  return children;
}

function getRenderAs(field: Field, valueType: ValueType): FieldRendering {
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
function generatePages(
  templates: StringMap<PageTemplate>,
  alterations: StringMap<PageAlteration>,
  forms: StringMap<Form>,
  pages: StringMap<Page>
) {
  for (const [name, template] of Object.entries(templates)) {
    const form = forms[template.formName];
    if (form) {
      const n = generatePage(template, form, pages);
      console.info(`page template ${name} processed to generate ${n} page/s`);
    } else {
      console.error(
        `template ${template} requires form ${template.formName}, but that form is not found`
      );
    }
  }

  for (const [name, alts] of Object.entries(alterations)) {
    const page = pages[name];
    if (page) {
      alterPage(page, alts);
      console.info(`page ${name} altered`);
    } else {
      console.error(
        `Alterations found for ${name} but the page is not found. Alterations skipped`
      );
    }
  }
}

function writeAll(
  comps: StringMap<any>,
  rootFolder: string,
  typ: string,
  allCompsName: string
) {
  let folderName = rootFolder + allCompsName + '/';
  mkdirSync(folderName, { recursive: true });

  /**
   * write individual files in the sub-folder
   */
  const compNames: string[] = [];
  for (const [name, comp] of Object.entries(comps)) {
    compNames.push(name);
    const fileName = folderName + name + '.ts';
    writeFileSync(
      fileName,
      `import {  ${typ} } from 'simplity-types';\nexport const ${name}: ${typ} = ${JSON.stringify(comp)};\n`
    );
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
