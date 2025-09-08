"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._columnSelection = void 0;
exports._columnSelection = {
    name: '_columnSelection',
    isVisibleToClient: true,
    recordType: 'simple',
    description: 'Column/Field to be included in the report',
    fields: [
        { name: 'seqNo', fieldType: 'optionalData', valueType: 'integer' },
        { name: 'name', fieldType: 'requiredData', valueType: 'text' },
        { name: 'label', fieldType: 'requiredData', valueType: 'text' },
    ],
};
//# sourceMappingURL=_columnSelection.js.map