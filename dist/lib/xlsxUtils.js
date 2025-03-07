import { utils, writeFile, readFile, } from 'xlsx';
import { mkdirSync, rmSync, existsSync } from 'fs';
const MAIN_SHEET_NAME = '_data';
const NAME_VALUE_HEADER = ['name', 'value'];
const EMIT_AS_STRING = { operations: true, fieldNames: true };
const EMIT_AS_ARRAY = {
    menuItems: true,
    modules: true,
    layouts: true,
    localLists: true,
    templates: true,
    valueLists: true,
    valueSchemas: true,
    actions: true,
};
const EMIT_AS_TREE = {
    dataPanel: { name: 'name', parent: 'parent', children: 'children' },
};
const MAIN_ATTRS = [
    'name',
    'appParams',
    'imageBasePath',
    'loginServiceName',
    'logoutServiceName',
    'serverUrl',
    'startingLayout',
    'startingModule',
    'tenantFieldName',
    'tenantNameInDb',
    'maxLengthForTextField',
    'tenantFieldName',
    'tenantNameInDb',
    'javaRootPackageName',
    'functions',
    'menuItems',
    'messages',
    'modules',
    'layouts',
    'templates',
    'valueLists',
    'valueSchemas',
];
const GROUP_ATTRS = [
    'cachedResponses',
    'pages',
    'records',
    'sqls',
    'templates',
];
const XLSX_OPTIONS = { cellDates: true, dense: true };
const FS_OPTIONS = { recursive: true };
export const xlsxUtils = {
    /**
     * write application meta data as spread-sheet books into a standard folder structure that mimics the meta-data folder structure
     * @param meta
     * @param folderName root folder name to be used for writing the files
     */
    writeXlsx,
    /**
     * create json Object for the contents of a work-book
     */
    bookToJson,
    /**
     * parse an xlsx file and convert it into a Json as per our convention
     * @param xlsxFileName
     * @returns Json
     */
    xlsxToJson,
};
/**
 * parse an xlsx file and convert it into a Json as per our convention
 * @param xlsxFileName
 * @returns Json
 */
function xlsxToJson(xlsxFileName) {
    return bookToJson(readFile(xlsxFileName, { dense: true }));
}
/**
 * write application meta data as spread-sheet books into a standard folder structure that mimics the meta-data folder structure
 * @param meta
 * @param folderName root folder name to be used for writing the files
 */
function writeXlsx(meta, folderName) {
    if (existsSync(folderName)) {
        console.info(`cleaning up folder: ${folderName}`);
        rmSync(folderName, FS_OPTIONS);
    }
    console.info(`creating folder: ${folderName}`);
    mkdirSync(folderName, FS_OPTIONS);
    writeXlsxFolder(emitApp(meta), folderName);
}
function writeXlsxFolder(folder, currentFolderName) {
    console.info(`writing to folder ${currentFolderName}`);
    for (const [name, entry] of Object.entries(folder)) {
        if (isBook(entry) === false) {
            const newFolder = currentFolderName + name + '/';
            mkdirSync(newFolder, FS_OPTIONS);
            console.info(`creating folder: ${newFolder}`);
            writeXlsxFolder(entry, newFolder);
            continue;
        }
        //it is a book. write it out.
        const book = utils.book_new();
        for (const [sheetName, sheet] of Object.entries(entry)) {
            console.info(`going to add sheet ${sheetName} to book ${name}`);
            utils.book_append_sheet(book, utils.aoa_to_sheet(sheet, XLSX_OPTIONS), sheetName);
        }
        const fileName = currentFolderName + name + '.xlsx';
        writeFile(book, fileName, XLSX_OPTIONS);
        console.info(`created file: ${fileName}`);
    }
}
/**
 * creates a JsonFolder instance for the components
 * @param meta
 * @returns JsonFolder that can be easily used to create xlsx files using any xlsx utility like SheetJS
 */
function emitApp(meta) {
    const folder = {};
    //create a json for all the sheets in app.xlsx in the root folder
    const json = {};
    for (const attr of MAIN_ATTRS) {
        const v = meta[attr];
        if (v !== undefined) {
            json[attr] = v;
        }
    }
    // main book in the root folder
    const book = {};
    const errors = [];
    book[MAIN_SHEET_NAME] = objectToSheet('', json, book, errors);
    folder.app = book;
    console.info(`book named app added to the root folder`);
    //folders for the collections
    for (const attr of GROUP_ATTRS) {
        const jsons = meta[attr];
        if (jsons === undefined) {
            console.info(`No components for ${attr}. Skipped.`);
            continue;
        }
        const subFolder = createSubfolder(jsons, errors);
        if (subFolder === undefined) {
            console.info(`subfolder ${attr} is empty. Skipped`);
        }
        else {
            folder[attr] = subFolder;
            console.info(` subfolder ${attr} added to the main folder`);
        }
    }
    /**
     * put the errors into a book, even if there are no errors
     */
    folder['conversionErrors'] = errorsToBook(errors);
    return folder;
}
/**
 * book is a string-map of arrays, where as folder is a string-map of string-map of....
 * @param entry
 */
function isBook(entry) {
    for (const value of Object.values(entry)) {
        return Array.isArray(value);
    }
    return false;
}
function createSubfolder(jsons, errors) {
    if (jsons === undefined) {
        return undefined;
    }
    const subFolder = {};
    let nbr = 0;
    for (const [jsonName, json] of Object.entries(jsons)) {
        if (json === undefined) {
            console.info(`Component ${jsonName} is undefined. Skipped`);
            continue;
        }
        const book = {};
        book[MAIN_SHEET_NAME] = objectToSheet('', json, book, errors);
        subFolder[jsonName] = book;
        console.info(`book named  ${jsonName} added to a sub-folder folder`);
        nbr++;
    }
    if (nbr > 0) {
        return subFolder;
    }
    return undefined;
}
function errorsToBook(errors) {
    const book = {};
    const sheet = [];
    if (errors.length === 0) {
        console.info('Folder created with no errors');
        sheet.push(['All Ok!!. No errors encountered']);
    }
    else {
        let slNo = 0;
        sheet.push(['Sl No', 'Error Message']);
        for (const error of errors) {
            slNo++;
            sheet.push([slNo, error]);
        }
        console.info(`Folder created with ${errors.length} errors`);
    }
    book['errors'] = sheet;
    return book;
}
function addError(error, errors) {
    errors.push(error);
    return `## Error-${errors.length} ##`;
}
/**
 * add rows based on the content of the json
 * header row is name, value. one row added per attribute having primitive value.
 * no data-rows if the json is undefined or has no attribute with primitive value.
 * additional arrays are added for any attribute with object value
 * @param sheetName Current sheet will be added to teh sheets collection with this name
 * @param json data for the current sheet
 * @param book sheets mapped by sheetNames
 * @param childNamePrefix empty for the root sheet, and sheetName for subsequent sheets.
 *  any additional sheets generated will be indexed with this prefix+attributeName
 * @param errors any error will be added this. value of the cell that is in error is a string that points to this error as 1-based index
 */
function objectToSheet(jsonName, json, book, errors) {
    const sheet = [NAME_VALUE_HEADER];
    for (const [name, v] of Object.entries(json)) {
        let childSheet;
        const typ = typeof v;
        const childJsonName = jsonName ? jsonName + '.' + name : name;
        const emitAsString = EMIT_AS_STRING[childJsonName];
        if (Array.isArray(v)) {
            if (emitAsString) {
                sheet.push([name, arrayToCell(name, v, errors)]);
                continue;
            }
            childSheet = arrayToSheet(v, errors);
        }
        else if (typ === 'object') {
            if (emitAsString) {
                sheet.push([name, objectToCell(name, v, errors)]);
                continue;
            }
            if (EMIT_AS_ARRAY[childJsonName]) {
                childSheet = arrayToSheet(Object.values(v), errors);
            }
            else {
                const attributeNames = EMIT_AS_TREE[childJsonName];
                if (attributeNames) {
                    childSheet = treeToSheet(attributeNames, v, errors);
                }
                else {
                    childSheet = objectToSheet(childJsonName, v, book, errors);
                }
            }
        }
        else {
            sheet.push([name, valueToCell(v, errors)]);
            continue;
        }
        if (childSheet === undefined) {
            console.info(`No data for ${childJsonName}. Sheet not added`);
        }
        else {
            book[childJsonName] = childSheet;
            console.info(`Sheet ${childJsonName} added`);
        }
    }
    return sheet;
}
/**
 * add a sheet to the sheets collection for the data in the input array
 * If input array has n entries,  teh sheet will have a header row and n data rows.
 * e.g. [[name1, nam2, ...], [val11, val12...}, [val21, val22...]...]
 *
 * if a cell can not be converted into a primitive, then an error-value is used as its value.
 */
function arrayToSheet(arr, errors, attributeToSkip) {
    if (arr.length === 0 || arr[0] === undefined) {
        return undefined;
    }
    const names = getHeader(arr, attributeToSkip);
    if (names.length == 0) {
        return undefined;
    }
    const sheet = [names];
    for (const json of arr) {
        const row = [];
        for (const name of names) {
            row.push(anyValueToCell(name, json[name], errors));
        }
        sheet.push(row);
    }
    return sheet;
}
function arrayToCell(arrayName, arr, errors) {
    const t = [];
    for (const v of arr) {
        t.push(anyValueToCell(arrayName, v, errors));
    }
    return t.join(',');
}
function objectToCell(objectName, json, errors) {
    const t = [];
    for (const [name, v] of Object.entries(json)) {
        const value = anyValueToCell(objectName + '.' + name, v, errors);
        t.push(name + '=' + value.toString());
    }
    return t.join(';');
}
function valueToCell(value, errors) {
    const typ = typeof value;
    switch (typ) {
        case 'undefined':
            return '';
        case 'bigint':
        case 'boolean':
        case 'number':
        case 'string':
            return value;
        default:
            return addError(`Value should be primitive but it is of type '${typ}' with value = ${JSON.stringify(value)}`, errors);
    }
}
function anyValueToCell(name, value, errors) {
    const typ = typeof value;
    switch (typ) {
        case 'undefined':
            return '';
        case 'bigint':
        case 'boolean':
        case 'number':
        case 'string':
            return value;
        case 'object':
            if (Array.isArray(value)) {
                return arrayToCell(name, value, errors);
            }
            return objectToCell(name, value, errors);
        default:
            return addError(`Value should be primitive but it is of type '${typ}' with value = ${JSON.stringify(value)}`, errors);
    }
}
function getHeader(jsons, attributeToSkip) {
    const names = {};
    for (const json of jsons) {
        for (const name of Object.keys(json)) {
            names[name] = true;
        }
    }
    if (attributeToSkip) {
        delete names[attributeToSkip];
    }
    return Object.keys(names);
}
function treeToSheet(names, node, errors) {
    const nodes = [node];
    flatten(names, node, nodes);
    return arrayToSheet(nodes, errors, names.children);
}
function flatten(names, node, nodes) {
    const parentName = node[names.name];
    const children = node[names.children];
    if (!children || children.length === 0) {
        console.info(`Node ${parentName} is a leaf node`);
        return;
    }
    for (const child of children) {
        child[names.parent] = parentName;
        nodes.push(child);
        flatten(names, child, nodes);
    }
}
/**
 * create a json as per our convention
 * @param book workbook to be converted
 * @returns json as per our convention of json-xlsx conversion
 */
function bookToJson(book) {
    const json = {};
    for (const [name, sheet] of Object.entries(book.Sheets)) {
        json[name] = sheetToJson(sheet);
    }
    const mainSheet = json[MAIN_SHEET_NAME];
    if (mainSheet) {
        delete json[MAIN_SHEET_NAME];
        for (const [name, value] of Object.entries(mainSheet)) {
            json[name] = value;
        }
    }
    return json;
}
/**
 * if the sheet has two columns with header row as NAME_VALUE_HEADER, then the other rows are considered to be name-value pairs
 * @param sheet
 * @returns empty array if the sheet contains no data.
 * Json object if the sheet contains name-value pairs.
 * array of objects otherwise
 */
function sheetToJson(sheet) {
    //get all values as AoA (string[][])
    const data = utils.sheet_to_json(sheet, { header: 1 });
    const firstRow = data && data[0];
    if (!firstRow) {
        return [];
    }
    if (isNameValueSheet(firstRow)) {
        const json = {};
        for (let i = 1; i < data.length; i++) {
            const pair = data[i];
            setNameValue(json, pair[0], pair[1]);
        }
        return json;
    }
    const arr = [];
    for (let i = 1; i < data.length; i++) {
        const dataRow = data[i];
        const json = {};
        arr.push(json);
        for (let j = 0; j < firstRow.length; j++) {
            setNameValue(json, firstRow[j], dataRow[j]);
        }
    }
    return arr;
}
function isNameValueSheet(firstRow) {
    if (firstRow.length != 2) {
        return false;
    }
    return (firstRow[0] === NAME_VALUE_HEADER[0] && firstRow[1] === NAME_VALUE_HEADER[1]);
}
function setNameValue(json, name, value) {
    const val = valueOf(value);
    if (val === '') {
        return false;
    }
    json[stringValueOf(name)] = val;
    return true;
}
function stringValueOf(cell) {
    if (cell === undefined) {
        return '';
    }
    return cell.toString();
}
function valueOf(cell) {
    switch (typeof cell) {
        case 'undefined':
            return '';
        case 'boolean':
        case 'number':
            return cell;
        default:
            return cell.toString().trim();
    }
}
//# sourceMappingURL=xlsxUtils.js.map