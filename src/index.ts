import { processComponents } from './lib/processComponents';

/**
 * utility to process all the meta data and generate various artifacts as per the design
 */
export const componentProcessor = {
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
   */
  process: processComponents,
};

/**
 * TODO: re-factor this to expose the right functionality for the app-user
 */
export * from './lib/xlsxUtils';
