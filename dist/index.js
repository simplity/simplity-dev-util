"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.componentProcessor = void 0;
const processComponents_1 = require("./lib/processComponents");
/**
 * utility to process all the meta data and generate various artifacts as per the design
 */
exports.componentProcessor = {
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
    process: processComponents_1.processComponents,
};
/**
 * TODO: re-factor this to expose the right functionality for the app-user
 */
__exportStar(require("./lib/xlsxUtils"), exports);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrREFBNEQ7QUFFNUQ7O0dBRUc7QUFDVSxRQUFBLGtCQUFrQixHQUFHO0lBQ2hDOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsT0FBTyxFQUFFLHFDQUFpQjtDQUMzQixDQUFDO0FBRUY7O0dBRUc7QUFDSCxrREFBZ0MifQ==