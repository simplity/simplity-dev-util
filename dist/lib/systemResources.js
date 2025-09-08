"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemResources = void 0;
const systemMessages_1 = require("./systemResources/systemMessages");
const _reportSettings_1 = require("./systemResources/rec/_reportSettings");
const systemValueLists_1 = require("./systemResources/systemValueLists");
const systemValueSchemas_1 = require("./systemResources/systemValueSchemas");
const _columnSelection_1 = require("./systemResources/rec/_columnSelection");
const _filters_1 = require("./systemResources/rec/_filters");
const _reportSettingsHeader_1 = require("./systemResources/rec/_reportSettingsHeader");
const _sorts_1 = require("./systemResources/rec/_sorts");
exports.systemResources = {
    records: {
        _columnSelection: _columnSelection_1._columnSelection,
        _filters: _filters_1._filters,
        _reportSettings: _reportSettings_1._reportSettings,
        _reportSettingsHeader: _reportSettingsHeader_1._reportSettingsHeader,
        _sorts: _sorts_1._sorts,
    },
    messages: systemMessages_1.systemMessages,
    valueLists: systemValueLists_1.systemValueLists,
    valueSchemas: systemValueSchemas_1.systemValueSchemas,
};
//# sourceMappingURL=systemResources.js.map