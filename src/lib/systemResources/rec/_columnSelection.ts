import { SimpleRecord } from 'simplity-types';

export const _columnSelection: SimpleRecord = {
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
