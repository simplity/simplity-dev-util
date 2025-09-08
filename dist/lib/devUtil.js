"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devUtil = void 0;
const generateCollectionFiles_1 = require("./generateCollectionFiles");
const processComponents_1 = require("./processComponents");
exports.devUtil = {
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
    processComponents: processComponents_1.processComponents,
    /**
     * Some components have very few attributes, and hence all instances of can be organized in a single file.
     * Like valueSchemas. However, components like page are better organized in individual files.
     * But then we need a way to create a collection of all these components. This is in a separate file where a constant is defined as a named-collection of all the components that are defined under sub-folders.
     * This utility automates the generation of these collection files.
     * @param compRoot The folder containing component files. defaults to './src/comps/'
     * @param importPrefix The prefix to use for imports. Like in "import {page1 } from 'prefix/pages/page1.page'". Defaults to '@/comps/'
     * @param outputFolder The folder to write the collection files. Defaults to './src/comps/generated/'
     */
    generateCollectionFiles: generateCollectionFiles_1.generateCollectionFiles,
};
//# sourceMappingURL=devUtil.js.map