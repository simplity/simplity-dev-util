import { StringMap, Page, Form, PageTemplate } from 'simplity-types';
/**
 * Processes the templates to generate pages.
 * @param templates The templates to process.
 * @param forms The forms to use for generating pages.
 * @param pages The pages to populate with generated content.
 */
export declare function processTemplates(templates: StringMap<PageTemplate>, forms: StringMap<Form>, pages: StringMap<Page>): number;
