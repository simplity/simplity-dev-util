import { StringMap, ValueSchema } from 'simplity-types';

export const systemValueSchemas: StringMap<ValueSchema> = {
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
