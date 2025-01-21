import { SimpleRecord } from 'simplity-types';

export const _filters: SimpleRecord = {
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
