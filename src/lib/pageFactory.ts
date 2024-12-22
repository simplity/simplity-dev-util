import { alterPage } from './alter';
import { generatePage } from './generate';

export const pageFactory = {
  /**
   * generate one or more pages and adds them to the simplity-based page component
   * @param template
   * @param form to be used for adding fields to the template
   * @param pages generated pages are added this collection/object
   * @returns number of pages generated. 0 in case of any error.
   */
  generatePage,

  /**
   * alter a page as per alteration specifications
   * @param pageToAlter received as any to avoid the compile time error with readonly check
   * @param alterations
   */
  alterPage,
};
