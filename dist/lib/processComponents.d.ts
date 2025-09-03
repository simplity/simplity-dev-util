import { GeneratorInput } from 'simplity-types';
export type DevFolders = {
    json: string;
    ts: string;
    types: string;
};
export declare function processComponents(appDesign: GeneratorInput, jsonFolder: string, tsFolder: string): void;
