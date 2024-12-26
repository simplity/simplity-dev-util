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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieGxzeFV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi94bHN4VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsK0JBT2M7QUFDZCwyQkFBbUQ7QUFnQm5ELE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQztBQUNoQyxNQUFNLGlCQUFpQixHQUFHLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzVDLE1BQU0sY0FBYyxHQUFvQixFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDO0FBQy9FLE1BQU0sYUFBYSxHQUFvQjtJQUNyQyxTQUFTLEVBQUUsSUFBSTtJQUNmLE9BQU8sRUFBRSxJQUFJO0lBQ2IsT0FBTyxFQUFFLElBQUk7SUFDYixVQUFVLEVBQUUsSUFBSTtJQUNoQixTQUFTLEVBQUUsSUFBSTtJQUNmLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFlBQVksRUFBRSxJQUFJO0lBQ2xCLE9BQU8sRUFBRSxJQUFJO0NBQ2QsQ0FBQztBQUNGLE1BQU0sWUFBWSxHQUE4QjtJQUM5QyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRTtDQUNwRSxDQUFDO0FBR0YsTUFBTSxVQUFVLEdBQXdCO0lBQ3RDLE1BQU07SUFDTixXQUFXO0lBQ1gsZUFBZTtJQUNmLGtCQUFrQjtJQUNsQixtQkFBbUI7SUFDbkIsV0FBVztJQUNYLGdCQUFnQjtJQUNoQixnQkFBZ0I7SUFDaEIsaUJBQWlCO0lBQ2pCLGdCQUFnQjtJQUNoQix1QkFBdUI7SUFDdkIsaUJBQWlCO0lBQ2pCLGdCQUFnQjtJQUNoQixxQkFBcUI7SUFDckIsV0FBVztJQUNYLFdBQVc7SUFDWCxVQUFVO0lBQ1YsU0FBUztJQUNULFNBQVM7SUFDVCxXQUFXO0lBQ1gsWUFBWTtJQUNaLGNBQWM7Q0FDZixDQUFDO0FBQ0YsTUFBTSxX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