import { join } from 'path';
import { statSync, readdirSync, writeFileSync } from 'fs';
const SRC_ROOT = 'src/lib/';
const OUTPUT_FOLDER = SRC_ROOT + 'generated/';
const IMPORT_PREFIX = '@/';
const collections = [
    {
        collectionName: 'records',
        ext: 'rec',
        collectionType: 'Record',
        nameType: 'RecordName',
        isAppSpecific: true,
    },
    {
        collectionName: 'pages',
        ext: 'page',
        collectionType: 'AppPage',
        isAppSpecific: false,
        nameType: 'PageName',
    },
    {
        collectionName: 'templates',
        ext: 'template',
        collectionType: 'AppTemplate',
        nameType: 'TemplateName',
        isAppSpecific: false,
    },
];
const DISCLAIMER = `/**
 * This is a generated file. Any edits are likely to be overwritten.
 */
`;
function generateAllCollections() {
    const typeFile = collections
        .map((p) => {
        const { collectionFile, namesFile } = emitFileContents(p);
        writeFileSync(join(OUTPUT_FOLDER, p.collectionName + '.ts'), collectionFile);
        return namesFile;
    })
        .join(';\n ');
    writeFileSync(join(OUTPUT_FOLDER, 'componentNames.ts'), typeFile);
}
/**
 * Collects components from the specified folder structure , and emits the contents of the files
 * It is assumed that the file name is the name of the component that is defined inside it.
 * A file is assumed to contain a component if it's name has the specified extension.
 * For example, customer.rec.ts file is assumed to contain a component named 'customer'.
 * NOTE: Ideally we should read the file, but this techniques works fine at this stage.
 * @param p details of folders etc.
 * @param compLocations for example {customer: 'table/customer.rec'.....}
 * @param errors Duplicate component name located at different folders is a possible error. Any such error is appended to this array
 * @returns The number of duplicate components found.
 */
function emitFileContents(p) {
    const comps = {};
    const startingFolder = join(SRC_ROOT, p.collectionName);
    const fullExtension = '.' + p.ext + '.ts';
    scanDirectory(comps, fullExtension, startingFolder);
    const imports = Object.entries(comps)
        .map(([name, relativePath]) => {
        return `import { ${name} } from '${IMPORT_PREFIX}${relativePath}';`;
    })
        .join('\n');
    const typeImport = p.isAppSpecific
        ? `import { ${p.nameType} } from 'simplity-types';`
        : `import { App${p.nameType}} from '${IMPORT_PREFIX}$types';`;
    const arr = Object.keys(comps);
    const names = arr.join(',\n  ');
    const quotedNames = arr.map((n) => `'${n}'`).join('\n| ');
    const collectionFile = `${DISCLAIMER}
import { StringMap } from 'simplity-types';
${imports}
${typeImport}

export const ${p.collectionName}: StringMap<${p.collectionType}> = {
  ${names}
};
`;
    const namesFile = `${DISCLAIMER}
  export type ${p.nameType} = ${quotedNames}
  ;
  `;
    return {
        collectionFile,
        namesFile,
    };
}
/**
 * Recursively scan the folders to collect all the components.
 * @param currentFolder The folder to scan.
 * @param relativePath The relative path of the current folder.
 */
function scanDirectory(compLocations, ext, currentFolder, relativePath = '') {
    const items = readdirSync(currentFolder);
    for (const item of items) {
        const fullPath = join(currentFolder, item);
        if (statSync(fullPath).isDirectory()) {
            const newRelativePath = relativePath ? join(relativePath, item) : item;
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
generateAllCollections();
//# sourceMappingURL=generateCompCollections.js.map