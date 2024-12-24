import { Page, PageAlteration } from 'simplity-types';
/**
 * alter a page as per alteration specifications
 * @param pageToAlter received as any to avoid the compile time error with readonly check
 * @param alterations
 */
export declare function alterPage(page: Page, alts: PageAlteration): void;
