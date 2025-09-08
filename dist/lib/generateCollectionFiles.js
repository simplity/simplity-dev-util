"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCollectionFiles = generateCollectionFiles;
const path_1 = require("path");
const fs_1 = require("fs");
const collections = [
    {
        name: 'alters',
        ext: 'alter',
        type: 'PageAlteration',
    },
    {
        name: 'handCodedPages',
        ext: 'page',
        type: 'AppPage',
        folderName: 'pages',
    },
    {
        name: 'records',
        ext: 'rec',
        type: 'Record',
    },
    {
        name: 'specs',
        ext: 'spec',
        type: 'ServiceSpec',
    },
    {
        name: 'templates',
        ext: 'template',
        type: 'PageTemplate',
    },
    {
        name: 'forms',
        ext: 'form',
        type: 'Form',
    },
];
const DISCLAIMER = `/**
 * This is a generated file. Any edits are likely to be overwritten.
 */
`;
/**
 * Some components have very few attributes, and hence all instances of can be organized in a single file.
 * Like valueSchemas. However, components like page are better organized in individual files.
 * But then we need a way to create a collection of all these components. This is in a separate file where a constant is defined as a named-collection of all the components that are defined under sub-folders.
 * This utility automates the generation of these collection files.
 * @param compRoot The folder containing component files. defaults to './src/comps/'
 * @param importPrefix The prefix to use for imports. Like in "import {page1 } from 'prefix/pages/page1.page'". Defaults to '@/comps/'
 * @param outputFolder The folder to write the collection files. Defaults to './src/comps/generated/'
 */
function generateCollectionFiles(compRoot = './src/comps/', importPrefix = '@/comps/', outputFolder = './src/comps/generated/') {
    for (const compDetails of collections) {
        console.log(`Processing ${compDetails.name}...`);
        const compLocations = {};
        const startingFolder = (0, path_1.join)(compRoot, compDetails.folderName || compDetails.name);
        /*
         * does the folder exist? if not skip it.
         */
        if (!(0, fs_1.existsSync)(startingFolder) ||
            !(0, fs_1.statSync)(startingFolder).isDirectory()) {
            console.warn(`Warning: ${startingFolder} is not a directory. Skipping.`);
            continue;
        }
        console.log(`Scanning ${startingFolder} files...`);
        scanDirectory(compLocations, '.ts', startingFolder);
        writeCollectionFile(compLocations, importPrefix, compDetails, outputFolder);
    }
}
/**
 * Recursively scan the folders to collect all the components.
 * @param currentFolder The folder to scan.
 * @param relativePath The relative path of the current folder.
 */
function scanDirectory(compLocations, ext, currentFolder, relativePath = '') {
    const items = (0, fs_1.readdirSync)(currentFolder);
    for (const item of items) {
        const fullPath = (0, path_1.join)(currentFolder, item);
        if ((0, fs_1.statSync)(fullPath).isDirectory()) {
            const newRelativePath = relativePath ? (0, path_1.join)(relativePath, item) : item;
            scanDirectory(compLocations, ext, fullPath, newRelativePath);
        }
        else if (item.endsWith(ext)) {
            const baseName = item.slice(0, -ext.length);
            if (compLocations[baseName]) {
                console.error(`${baseName} is a duplicate at ${relativePath} and at ${compLocations[baseName]}`);
            }
            else {
                compLocations[baseName] = relativePath;
            }
        }
    }
}
function writeCollectionFile(compLocations, importPrefix, compDetails, folderName) {
    const names = Object.keys(compLocations).join(',\n  ');
    const imports = Object.entries(compLocations)
        .map(([name, relativePath]) => `import { ${toSimpleName(name)} } from '${importPrefix}${compDetails.name}/${relativePath}/${name}';`)
        .join('\n');
    const typeSource = compDetails.type.startsWith('App')
        ? '@/types'
        : 'simplity-types';
    //contents of the file
    const text = `${DISCLAIMER}
import { StringMap } from 'simplity-types';
import { ${compDetails.type} } from '${typeSource}';
${imports}

export const ${compDetails.name}: StringMap<${compDetails.type}> = {
  ${names}
};
`;
    console.log(`Writing ${compDetails.name}.ts in folder ${folderName}...`);
    writeIt(folderName, compDetails.name + '.ts', text);
}
function writeIt(folder, fileName, text) {
    //create the folder if it doesn't exist
    if (!(0, fs_1.existsSync)(folder)) {
        (0, fs_1.mkdirSync)(folder, { recursive: true });
    }
    (0, fs_1.writeFileSync)((0, path_1.join)(folder, fileName), text);
}
function toSimpleName(name) {
    return name.substring(0, name.indexOf('.'));
}
// generateCollectionFiles('./src/comps/gen/', '@/comps/', './src/comps/gen/');
// generateCollectionFiles(); //uncomment to use defaults
//# sourceMappingURL=generateCollectionFiles.js.map