import { AppMetaData, StringMap } from 'simplity-types';
import { WorkBook } from 'xlsx';
export type Json = StringMap<unknown>;
type JsonCell = string | number | boolean | bigint;
type JsonRow = JsonCell[];
export type JsonSheet = JsonRow[];
export type JsonBook = StringMap<JsonSheet>;
export type JsonFolderEntry = JsonFolder | JsonBook;
export type JsonFolder = {
    [name: string]: JsonFolderEntry;
};
export declare const xlsxUtils: {
    /**
     * write application meta data as spread-sheet books into a standard folder structure that mimics the meta-data folder structure
     * @param meta
     * @param folderName root folder name to be used for writing the files
     */
    writeXlsx: typeof writeXlsx;
    /**
     * create json Object for the contents of a work-book
     */
    bookToJson: typeof bookToJson;
    /**
     * parse an xlsx file and convert it into a Json as per our convention
     * @param xlsxFileName
     * @returns Json
     */
    xlsxToJson: typeof xlsxToJson;
};
/**
 * parse an xlsx file and convert it into a Json as per our convention
 * @param xlsxFileName
 * @returns Json
 */
declare function xlsxToJson(xlsxFileName: string): Json;
/**
 * write application meta data as spread-sheet books into a standard folder structure that mimics the meta-data folder structure
 * @param meta
 * @param folderName root folder name to be used for writing the files
 */
declare function writeXlsx(meta: AppMetaData, folderName: string): void;
/**
 * create a json as per our convention
 * @param book workbook to be converted
 * @returns json as per our convention of json-xlsx conversion
 */
declare function bookToJson(book: WorkBook): Json;
export {};
