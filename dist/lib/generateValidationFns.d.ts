import { ValueSchema } from 'simplity-types';
/**
 * Generates validation functions for the given schemas.
 * @param schemas The schemas to generate validation functions for.
 * @returns A string containing the generated validation functions. this can be written out to a file with ".ts" extension.
 */
export declare function generateValidationFns(schemas: Record<string, ValueSchema>): string;
