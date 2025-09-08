"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._reportSettingsHeader = void 0;
exports._reportSettingsHeader = {
    name: '_reportSettingsHeader',
    isVisibleToClient: true,
    recordType: 'simple',
    description: 'Main/Header for report settings',
    fields: [
        {
            name: 'maxRows',
            fieldType: 'optionalData',
            valueType: 'integer',
            description: 'Maximum rows to be fetched',
            defaultValue: '100',
        },
    ],
};
//# sourceMappingURL=_reportSettingsHeader.js.map