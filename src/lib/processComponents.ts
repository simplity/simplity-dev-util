import { mkdirSync, rmSync, writeFileSync } from 'fs';
import {
  ColumnDetails,
  DataField,
  Field,
  FixedKeyedList,
  FixedList,
  Form,
  GeneratorInput,
  LeafComponent,
  ListSource,
  Page,
  PageAlteration,
  PageComponent,
  Panel,
  RangePanel,
  ReferredField,
  SimpleList,
  StringMap,
  TableEditor,
  TableViewer,
  ValueList,
} from 'simplity-types';
import { alterPage } from './alterPage';
import { processTemplates } from './processTemplates';
import { systemResources } from './systemResources';
import { generateForms } from './generateForms';
import { processRecords } from './processRecords';

export type DevFolders = {
  json: string;
  ts: string;
  types: string;
};

/**
 * attributes for application.json
 */
type AppJson = {
  appName: string;
  maxLengthForTextField?: number;
  tenantFieldName?: string;
  tenantNameInDb?: string;
};

/**
 * most of our components have an attribute named 'name', and it is indexed into the collection with that name.
 */
type NamedObject = {
  name: string;
  [key: string]: any;
};

export function processComponents(
  appDesign: GeneratorInput,
  jsonFolder: string,
  tsFolder: string,
) {
  let nbrErrors = 0;
  /**
   * check if all our named-components have the right name
   */
  const records = appDesign.records || {};
  const pages = appDesign.pages || {};
  const templates = appDesign.templates || {};
  const alters = appDesign.alters || {};
  const valueLists = appDesign.valueLists || {};
  const valueSchemas = appDesign.valueSchemas || {};

  Object.entries({
    records,
    pages,
    templates,
    alters,
    valueLists,
    valueSchemas,
  }).forEach(([key, value]) => {
    nbrErrors += checkNames(value, `${key}.ts`);
  });

  /**
   * 0. clean-up folders that we are going to generate to
   */
  for (const folder of [jsonFolder, tsFolder]) {
    rmSync(folder, { recursive: true, force: true });
    mkdirSync(folder);
  }

  /**
   * 1. application.json
   */
  let fileName = jsonFolder + 'application.json';
  const appJson: AppJson = {
    appName: appDesign.name,
    maxLengthForTextField: appDesign.maxLengthForTextField,
    tenantFieldName: appDesign.tenantFieldName,
    tenantNameInDb: appDesign.tenantNameInDb,
  };
  writeFileSync(fileName, JSON.stringify(appJson));
  done(fileName);

  /**
   * 2. valueLists.json
   */
  fileName = jsonFolder + 'valueLists.json';
  writeFileSync(
    fileName,
    JSON.stringify({
      valueLists: {
        ...systemResources.valueLists,
        ...appDesign.valueLists,
      },
    }),
  );
  done(fileName);

  /**
   * 3. messages.json
   */
  fileName = jsonFolder + 'messages.json';
  writeFileSync(
    fileName,
    JSON.stringify({
      messages: { ...systemResources.messages, ...appDesign.messages },
    }),
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
        ...appDesign.valueSchemas,
      },
    }),
  );
  done(fileName);

  /**
   * records are quite clumsy as of now because of the mismatch between the way the server and the client use the terms "forms" and "records".
   * This needs some serious re-factoring
   *
   * Note: framework requires some records. These are defined in systemResources.records
   */
  let [processedRecords, n] = processRecords({
    ...systemResources.records,
    ...records,
  });
  nbrErrors += n;

  /**
   * 5. records.json
   * Records are already extended, and any references are already resolved. Java generator need not handle 'extended' records...
   */
  writeJsons(jsonFolder, 'rec', {
    ...processedRecords.all,
    ...processedRecords.simple,
  });

  /**
   * 6. forms.json
   * Composite records are called forms on the server app.
   */
  writeJsons(jsonFolder, 'form', processedRecords.composite);

  /**
   * 7. sql.json
   */
  writeJsons(jsonFolder, 'sql', appDesign.sqls || {});

  /**
   * done with server side. Let's now generate .ts files for the client-app
   */
  /**
   * 8. listSources.ts
   */
  writeListSources(appDesign.valueLists, tsFolder);

  /**
   * 9. /form/*.ts
   */
  const forms: StringMap<Form> = {};
  nbrErrors += generateForms(processedRecords, forms);
  writeAll(forms, tsFolder, 'Form', 'forms');

  /**
   * resolve references in the hand-crafted pages
   */
  nbrErrors += processPages(pages, forms);
  /**
   * generate pages from templates. Generated pages are added to the pages collection
   */
  nbrErrors += processTemplates(templates, forms, pages);

  /**
   * Alter the pages based on the defined alterations. Note that the alteration could be on hand-crafted pages or on the generated pages.
   */
  alterPages(alters, pages);

  /**
   * 10. page.ts for all pages. These include hand-crafted pages that have been de-referenced as well as generated pages, duly altered.
   */
  writeAll(pages, tsFolder, 'Page', 'pages');

  /**
   * 11. write collection files for pages and forms
   */

  let text = toCollectionFile(Object.keys(pages), 'pages', 'Page', 'PageName');
  writeFileSync(tsFolder + 'pages/index.ts', text);

  text = toCollectionFile(Object.keys(forms), 'forms', 'Form', 'FormName');
  writeFileSync(tsFolder + 'forms/index.ts', text);

  if (nbrErrors == 0) {
    return;
  }

  console.error(
    `${nbrErrors} errors found. Files are still generated for debugging purposes. They may not be usable!!`,
  );
  process.exit(1);
}

function processTable(
  table: TableEditor | TableViewer,
  form: Form | undefined,
  pageName: string,
): number {
  if (!table.editable && table.columns) {
    if (table.children?.length) {
      console.error(
        `Error: Page: ${pageName} Table '${table.name}': Both children and columns are specified. Columns ignored.`,
      );
      return 1;
    }
    //nothing to process
    return 0;
  }

  let children = table.children;
  if (children && children.length) {
    const n = processFields(children, form, pageName);
    if (n > 0) {
      return n;
    }
  } else if (form) {
    children = [];
    for (const fieldName of form.fieldNames) {
      const field = form.fields[fieldName];
      children.push({ ...field, compType: 'field' });
    }
    table.children = children;
  } else {
    if (table.editable) {
      console.error(
        `Error:  Page: ${pageName} Table '${table.name}' is editable. Editable table should either specify child-components or a form`,
      );
      return 1;
    }
    console.warn(
      `Warn: Page: ${pageName} Table '${table.name}': Data will be rendered dynamically based on the columns received at run time.`,
    );
    return 0;
  }

  /**
   * table viewer is optimized for read-only by converting comps into ColumnDetails
   */
  if (!table.editable) {
    table.columns = compsToCols(children);
    delete table.children;
  }
  return 0;
}

function compsToCols(comps: LeafComponent[]) {
  const cols: ColumnDetails[] = [];
  for (const comp of comps) {
    if (comp.compType === 'field' || comp.compType === 'referred') {
      const col = fieldToCol(comp as DataField);
      if (col) {
        cols.push(col);
      }
      continue;
    }

    if (comp.compType === 'range') {
      const r = comp as RangePanel;
      for (const f of [r.fromField, r.toField]) {
        const col = fieldToCol(f as DataField);
        if (col) {
          cols.push(col);
        }
      }
      continue;
    }
    cols.push({
      name: comp.name,
      valueType: 'text',
      label: comp.label || toLabel(comp.name),
      comp,
    });
  }
  return cols;
}

function fieldToCol(field: Field | DataField): ColumnDetails | undefined {
  if (field.renderAs === 'hidden' || field.hideInList) {
    return undefined;
  }
  const col: ColumnDetails = {
    name: field.name,
    label: field.label || toLabel(field.name),
    valueType: field.valueType,
    valueFormatter: field.valueFormatter,
    onClick: field.onClick,
  };
  if (field.listOptions) {
    col.valueList = toMap(field.listOptions);
  }
  return col;
}

/**
 * generated pages are written to a separate folder, and the run time system uses these generated pages rather than the ones written by the programmer
 */
function alterPages(
  alterations: StringMap<PageAlteration>,
  pages: StringMap<Page>,
) {
  for (const [name, alts] of Object.entries(alterations)) {
    const page = pages[name];
    if (page) {
      alterPage(page, alts);
      //console.info(`page ${name} altered`);
    } else {
      console.error(
        `Error: Alteration for Page ${name}:  Alterations specified, but that page is not defined`,
      );
    }
  }
}

/**
 * A page component may have references. All the references are replaced with relevant sub-components.
 * Note that the page component is altered/updated in place.
 * @param pages to be processed
 * @param forms source of forms to resolve any references in the pages
 */
function processPages(pages: StringMap<Page>, forms: StringMap<Form>): number {
  let n = 0;
  for (const page of Object.values(pages)) {
    let form: Form | undefined;
    if (page.formName) {
      form = forms[page.formName];
      if (!form) {
        console.error(
          `Error: Page '${page.name}: Form ${page.formName} is not a valid form name`,
        );
        n++;
      }
    }
    n += processPanel(page.dataPanel, form, forms, page.name);
  }
  return n;
}

function processPanel(
  panel: Panel,
  form: Form | undefined,
  forms: StringMap<Form>,
  pageName: string,
): number {
  let n = 0;

  if (panel.childFormName) {
    form = forms[panel.childFormName];
    if (!form) {
      console.error(
        `Error: Page '${pageName}': Panel ${panel.name} refers to form '${panel.childFormName}' but that form is not defined`,
      );
      n++;
    }
  }

  const children: PageComponent[] = [];
  // start with fields selected from the associated form
  if (panel.fieldNames) {
    if (!form) {
      console.error(
        `Error: Page '${pageName}': Panel ${panel.name} defines fieldName, but no form is associated with this page.`,
      );
      return 1;
    }
    const names =
      panel.fieldNames === 'all' ? form.fieldNames : panel.fieldNames;
    for (const fieldName of names) {
      const f = form.fields[fieldName];
      if (f) {
        children.push(f);
      } else {
        console.error(
          `Error: Page ${pageName}: Panel ${panel.name} specifies '${fieldName}' as one of the fields but that field is not defined in the associated form '${form!.name}' `,
        );
        n++;
      }
    }
  }

  if (panel.children) {
    for (const child of panel.children!) {
      if (child.compType === 'referred') {
        const f = processRefField(child as ReferredField, form);
        if (f) {
          children.push(f);
        } else {
          n++;
        }
        continue;
      }

      children.push(child);

      if (child.compType === 'range') {
        const range = child as RangePanel;
        for (const leftOrRight of ['fromField', 'toField'] as (
          | 'fromField'
          | 'toField'
        )[]) {
          let field = range[leftOrRight];
          if (field.compType === 'referred') {
            const f = processRefField(field, form);
            if (f) {
              range[leftOrRight] = f;
            } else {
              n++;
            }
          }
        }
        continue;
      }

      if (child.compType === 'panel') {
        n += processPanel(child as Panel, form, forms, pageName);
        continue;
      }

      if (child.compType === 'table') {
        const table = child as TableEditor | TableViewer;
        const form = table.formName ? forms[table.formName] : undefined;
        n += processTable(table as TableEditor, form, pageName);
      }
    }
  }
  panel.children = children;
  return n;
}

function processRefField(
  field: ReferredField,
  form?: Form,
): DataField | undefined {
  if (!form) {
    console.error(
      `Error: Field: ${field.name}: This is a referred field, but there is no applicable form.`,
    );
    return undefined;
  }

  const f = form.fields[field.name];
  if (f) {
    return { ...f, ...field, compType: 'field' };
  }
  console.error(
    `Error: Field: ${field.name}: This is a referred field, but the applicable form '${form.name}' has no such field.`,
  );
  return undefined;
}

function toMap(arr: SimpleList): StringMap<string> {
  const map: StringMap<string> = {};
  for (const { label, value } of arr) {
    map[value] = label;
  }
  return map;
}

function processFields(
  children: LeafComponent[],
  form: Form | undefined,
  pageName: string,
): number {
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
      console.error(
        `Error: Page: ${pageName} Field ${child.name} is a referred field, but the page or the enclosing panel does not specify a form`,
      );
      n++;
      continue;
    }

    let f = form.fields[child.name];
    if (f) {
      children[i] = { ...f, ...child, compType: 'field' };
      continue;
    }

    console.error(
      `Error: Page: ${pageName} Field ${child.name} is a referred field, but the form ${form.name} has no field with that name`,
    );
    n++;
  }
  return n;
}

function writeJsons(
  jsonFolder: string,
  typ: string,
  comps: { [key: string]: any },
) {
  const folder = jsonFolder + typ + '/';
  mkdirSync(folder);
  for (const [name, comp] of Object.entries(comps)) {
    if (name !== comp.name!) {
      console.error(
        `Error: Component with name='${comp.name}' is indexed with key='${name}. This is incorrect. Name should match the indexed-key to ensure that the name is unique across all records\n json NOT created for this record`,
      );
      continue;
    }

    const fileName = folder + name + '.' + typ + '.json';
    writeFileSync(fileName, JSON.stringify(comp));
    done(fileName);
  }
}

function writeListSources(valueLists: StringMap<ValueList>, tsFolder: string) {
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
    } else {
      listSources[name] = {
        name,
        isKeyed: list.isKeyed,
        isRuntime: true,
        okToCache: false,
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

function done(_fileName: string): void {
  //console.info(`file ${fileName} created.`);
}

function checkNames(objects: StringMap<NamedObject>, fileName: string): number {
  let nbrErrors = 0;
  for (const [name, obj] of Object.entries(objects)) {
    if (name === '') {
      console.error(`Error: Empty string as name found in file ${fileName}.`);
      nbrErrors++;
      continue;
    }

    if (name !== obj.name) {
      console.error(
        `Error: name='${obj.name}' but it is indexed as '${name}' in the file ${fileName}. Value list must be indexed as its name`,
      );
      nbrErrors++;
    }
  }
  return nbrErrors;
}

function writeAll(
  comps: StringMap<any>,
  rootFolder: string,
  typ: string,
  allCompsName: string,
) {
  let folderName = rootFolder + allCompsName + '/';
  mkdirSync(folderName, { recursive: true });

  /**
   * write individual files in the sub-folder
   */
  const compNames: string[] = [];
  for (const [name, comp] of Object.entries(comps)) {
    compNames.push(name);
    const fileName = `${folderName}${name}.ts`;
    writeFileSync(
      fileName,
      `import {  ${typ} } from 'simplity-types';
      export const ${name}: ${typ} = ${JSON.stringify(comp)};\n`,
    );
    done(fileName);
  }
}

function toCollectionFile(
  names: string[],
  compName: string,
  compType: string,
  nameType: string,
): string {
  const imports = names
    .map((name) => `import { ${name} } from './${name}';`)
    .join('\n');

  return `/**
 * This is a generated file. Any edits are likely to be overwritten.
 */

import { StringMap, ${compType} } from 'simplity-types';
${imports}

export const ${compName}: StringMap<${compType}> = {
  ${names.join(',\n  ')}
};

export type ${nameType} = '${names.join("' | '")}';
`;
}

function toLabel(name: string): string {
  if (!name) {
    return '';
  }
  const firstChar = name.charAt(0).toUpperCase();
  const n = name.length;
  if (n === 1) {
    return firstChar;
  }
  const text = firstChar + name.substring(1);
  let label = '';
  /**
   * we have  to ensure that the first character is upper case.
   * hence the loop will end after adding all the words when we come from the end
   */
  let lastAt = n;
  for (let i = n - 1; i >= 0; i--) {
    const c = text.charAt(i);
    if (c >= 'A' && c <= 'Z') {
      const part = text.substring(i, lastAt);
      if (label) {
        label = part + ' ' + label;
      } else {
        label = part;
      }
      lastAt = i;
    }
  }
  return label;
}
