/**
 * Some components have very few attributes, and hence all instances of can be organized in a single file.
 * Like valueSchemas. However, components like page are better organized in individual files.
 * But then we need a way to create a collection of all these components. This is in a separate file where a constant is defined as a named-collection of all the components that are defined under sub-folders.
 * This utility automates the generation of these collection files.
 * @param compRoot The folder containing component files. defaults to './src/comps/'
 * @param importPrefix The prefix to use for imports. Like in "import {page1 } from 'prefix/pages/page1.page'". Defaults to '@/comps/'
 * @param outputFolder The folder to write the collection files. Defaults to './src/comps/generated/'
 */
export declare function generateCollectionFiles(compRoot?: string, importPrefix?: string, outputFolder?: string): void;
