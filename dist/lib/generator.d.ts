import { AppMetaData } from 'simplity-types';
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
 * @param pagesFolder where pages are to be generated.
 * This is optional, and meant only for the developer, and not for the app.
 * Should be outside of src folder to ensure that these are not part of the package.
 * undefined to skip this, as it is anyways not used by the app.
 *
 */
export declare function processMeta(appMetaData: AppMetaData, jsonFolder: string, tsFolder: string, pagesFolder?: string): void;
