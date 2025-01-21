import { StringMap, ValueSchema } from 'simplity-types';

export const systemValueSchemas: StringMap<ValueSchema> = {
  _name: {
    name: '_name',
    valueType: 'text',
    maxLength: 50,
    messageName: '_invalidName',
  },
};
