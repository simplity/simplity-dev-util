import { SimpleRecord } from 'simplity-types';

export const _reportSettingsHeader: SimpleRecord = {
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
