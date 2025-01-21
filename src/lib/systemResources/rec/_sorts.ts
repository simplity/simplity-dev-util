import { SimpleRecord } from 'simplity-types';

export const _sorts: SimpleRecord = {
  name: '_sorts',
  isVisibleToClient: true,
  recordType: 'simple',
  description: 'Columns to be sorted on',
  fields: [
    { name: 'name', fieldType: 'requiredData', valueType: 'text' },
    {
      name: 'ascending',
      fieldType: 'requiredData',
      valueType: 'boolean',
      renderAs: 'check-box',
    },
  ],
};
