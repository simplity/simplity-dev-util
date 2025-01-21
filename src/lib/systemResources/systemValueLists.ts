import { StringMap, RuntimeList, ValueList } from 'simplity-types';

export const systemValueLists: StringMap<ValueList> = {
  _reportName: {
    name: '_reportName',
    listType: 'runtime',
    dbTableName: '_dynamic_report',
    dbColumn1: 'report_name',
    dbColumn2: 'report_name',
  } as RuntimeList,

  _reportVariantName: {
    name: '_reportVariantName',
    listType: 'runtime',
    isKeyed: true,
    dbTableName: '_report_variant',
    dbColumn1: 'variant_name',
    dbColumn2: 'variant_name',
    keyColumn: 'report_name',
  } as RuntimeList,
};
