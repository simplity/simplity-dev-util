import { systemMessages } from './systemResources/systemMessages';
import { _reportSettings } from './systemResources/rec/_reportSettings';
import { systemValueLists } from './systemResources/systemValueLists';
import { systemValueSchemas } from './systemResources/systemValueSchemas';
import { _columnSelection } from './systemResources/rec/_columnSelection';
import { _filters } from './systemResources/rec/_filters';
import { _reportSettingsHeader } from './systemResources/rec/_reportSettingsHeader';
import { _sorts } from './systemResources/rec/_sorts';

export const systemResources = {
  records: {
    _columnSelection,
    _filters,
    _reportSettings,
    _reportSettingsHeader,
    _sorts,
  },
  messages: systemMessages,
  valueLists: systemValueLists,
  valueSchemas: systemValueSchemas,
};
