"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemValueSchemas = void 0;
exports.systemValueSchemas = {
    _name: {
        name: '_name',
        valueType: 'text',
        maxLength: 50,
        messageName: '_invalidName',
    },
    /**
     * standard/default for each value type
     */
    _text: {
        name: '_text',
        valueType: 'text',
        minLength: 1,
        maxLength: 10000,
    },
    _integer: {
        name: '_integer',
        valueType: 'integer',
        maxValue: 99999999999,
        minValue: 0,
    },
    _boolean: {
        name: '_boolean',
        valueType: 'boolean',
    },
};
//# sourceMappingURL=systemValueSchemas.js.map