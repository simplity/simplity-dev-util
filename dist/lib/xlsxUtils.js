"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xlsxUtils = void 0;
const xlsx_1 = require("xlsx");
const fs_1 = require("fs");
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
    'version',
    'date',
    'description',
    'maxLengthForTextField',
    'tenantFieldName',
    'tenantNameInDb',
    'loginServiceName',
    'logoutServiceName',
    'javaRootPackageName',
    'serverUrl',
    'imageBasePath',
    'startingLayout',
    'startingModule',
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
    'appParams',
    'cachedResponses',
    'pages',
    'records',
    'sqls',
    'templates',
];
const XLSX_OPTIONS = { cellDates: true, dense: true };
const FS_OPTIONS = { recursive: true };
exports.xlsxUtils = {
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
    return bookToJson((0, xlsx_1.readFile)(xlsxFileName, { dense: true }));
}
/**
 * write application meta data as spread-sheet books into a standard folder structure that mimics the meta-data folder structure
 * @param meta
 * @param folderName root folder name to be used for writing the files
 */
function writeXlsx(meta, folderName) {
    if ((0, fs_1.existsSync)(folderName)) {
        console.info(`cleaning up folder: ${folderName}`);
        (0, fs_1.rmSync)(folderName, FS_OPTIONS);
    }
    console.info(`creating folder: ${folderName}`);
    (0, fs_1.mkdirSync)(folderName, FS_OPTIONS);
    writeXlsxFolder(emitApp(meta), folderName);
}
function writeXlsxFolder(folder, currentFolderName) {
    console.info(`writing to folder ${currentFolderName}`);
    for (const [name, entry] of Object.entries(folder)) {
        if (isBook(entry) === false) {
            const newFolder = currentFolderName + name + '/';
            (0, fs_1.mkdirSync)(newFolder, FS_OPTIONS);
            console.info(`creating folder: ${newFolder}`);
            writeXlsxFolder(entry, newFolder);
            continue;
        }
        //it is a book. write it out.
        const book = xlsx_1.utils.book_new();
        for (const [sheetName, sheet] of Object.entries(entry)) {
            console.info(`going to add sheet ${sheetName} to book ${name}`);
            xlsx_1.utils.book_append_sheet(book, xlsx_1.utils.aoa_to_sheet(sheet, XLSX_OPTIONS), sheetName);
        }
        const fileName = currentFolderName + name + '.xlsx';
        (0, xlsx_1.writeFile)(book, fileName, XLSX_OPTIONS);
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
    const data = xlsx_1.utils.sheet_to_json(sheet, { header: 1 });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieGxzeFV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi94bHN4VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsK0JBT2M7QUFDZCwyQkFBbUQ7QUFnQm5ELE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQztBQUNoQyxNQUFNLGlCQUFpQixHQUFHLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzVDLE1BQU0sY0FBYyxHQUFvQixFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDO0FBQy9FLE1BQU0sYUFBYSxHQUFvQjtJQUNyQyxTQUFTLEVBQUUsSUFBSTtJQUNmLE9BQU8sRUFBRSxJQUFJO0lBQ2IsT0FBTyxFQUFFLElBQUk7SUFDYixVQUFVLEVBQUUsSUFBSTtJQUNoQixTQUFTLEVBQUUsSUFBSTtJQUNmLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFlBQVksRUFBRSxJQUFJO0lBQ2xCLE9BQU8sRUFBRSxJQUFJO0NBQ2QsQ0FBQztBQUNGLE1BQU0sWUFBWSxHQUE4QjtJQUM5QyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRTtDQUNwRSxDQUFDO0FBR0YsTUFBTSxVQUFVLEdBQXdCO0lBQ3RDLE1BQU07SUFDTixTQUFTO0lBQ1QsTUFBTTtJQUNOLGFBQWE7SUFDYix1QkFBdUI7SUFDdkIsaUJBQWlCO0lBQ2pCLGdCQUFnQjtJQUNoQixrQkFBa0I7SUFDbEIsbUJBQW1CO0lBQ25CLHFCQUFxQjtJQUNyQixXQUFXO0lBQ1gsZUFBZTtJQUNmLGdCQUFnQjtJQUNoQixnQkFBZ0I7SUFDaEIsV0FBVztJQUNYLFdBQVc7SUFDWCxVQUFVO0lBQ1YsU0FBUztJQUNULFNBQVM7SUFDVCxXQUFXO0lBQ1gsWUFBWTtJQUNaLGNBQWM7Q0FDZixDQUFDO0FBQ0YsTUFBTSxXQUFXLEdB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