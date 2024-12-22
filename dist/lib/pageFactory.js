"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageFactory = void 0;
const alter_1 = require("./alter");
const generate_1 = require("./generate");
exports.pageFactory = {
    /**
     * generate one or more pages and adds them to the simplity-based page component
     * @param template
     * @param form to be used for adding fields to the template
     * @param pages generated pages are added this collection/object
     * @returns number of pages generated. 0 in case of any error.
     */
    generatePage: generate_1.generatePage,
    /**
     * alter a page as per alteration specifications
     * @param pageToAlter received as any to avoid the compile time error with readonly check
     * @param alterations
     */
    alterPage: alter_1.alterPage,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFnZUZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BhZ2VGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFvQztBQUNwQyx5Q0FBMEM7QUFFN0IsUUFBQSxXQUFXLEdBQUc7SUFDekI7Ozs7OztPQU1HO0lBQ0gsWUFBWSxFQUFaLHVCQUFZO0lBRVo7Ozs7T0FJRztJQUNILFNBQVMsRUFBVCxpQkFBUztDQUNWLENBQUMifQ==