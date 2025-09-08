"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._filters = void 0;
exports._filters = {
    name: '_filters',
    isVisibleToClient: true,
    recordType: 'simple',
    description: 'Filtering criterion for columns',
    fields: [
        {
            name: 'name',
            fieldType: 'requiredData',
            valueType: 'text',
            label: 'Name',
        },
        {
            name: 'comparator',
            fieldType: 'requiredData',
            valueType: 'text',
            label: 'Condition',
        },
        { name: 'value', fieldType: 'requiredData', valueType: 'text' },
        { name: 'toValue', fieldType: 'optionalData', valueType: 'text' },
    ],
};
//# sourceMappingURL=_filters.js.map