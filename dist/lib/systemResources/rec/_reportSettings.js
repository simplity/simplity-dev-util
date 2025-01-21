"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._reportSettings = void 0;
exports._reportSettings = {
    name: '_reportSettings',
    recordType: 'simple',
    description: 'configuration of a dynamic report. This may be done by the app=administrator, or by an end-users',
    isVisibleToClient: true,
    nameInDb: '_report_settings',
    operations: ['create', 'delete', 'filter', 'get', 'save', 'update'],
    fields: [
        {
            name: 'reportName',
            fieldType: 'primaryKey',
            valueType: 'text',
            nameInDb: 'report_name',
            description: 'Name of the underlying record that can fetch data for this report using filter method',
        },
        {
            name: 'variantName',
            fieldType: 'primaryKey',
            valueType: 'text',
            nameInDb: 'variant_name',
            description: 'Must be unique for a record.',
            label: 'Variant Name',
        },
        /*
         * we need fields regarding ownership and security. We will add them later
         */
        {
            name: 'settings',
            fieldType: 'requiredData',
            valueType: 'text',
            nameInDb: 'settings',
            description: 'JSON for the settings.',
        },
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX3JlcG9ydFNldHRpbmdzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2xpYi9zeXN0ZW1SZXNvdXJjZXMvcmVjL19yZXBvcnRTZXR0aW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFYSxRQUFBLGVBQWUsR0FBaUI7SUFDM0MsSUFBSSxFQUFFLGlCQUFpQjtJQUN2QixVQUFVLEVBQUUsUUFBUTtJQUNwQixXQUFXLEVBQ1Qsa0dBQWtHO0lBQ3BHLGlCQUFpQixFQUFFLElBQUk7SUFDdkIsUUFBUSxFQUFFLGtCQUFrQjtJQUM1QixVQUFVLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQztJQUNuRSxNQUFNLEVBQUU7UUFDTjtZQUNFLElBQUksRUFBRSxZQUFZO1lBQ2xCLFNBQVMsRUFBRSxZQUFZO1lBQ3ZCLFNBQVMsRUFBRSxNQUFNO1lBQ2pCLFFBQVEsRUFBRSxhQUFhO1lBQ3ZCLFdBQVcsRUFDVCx1RkFBdUY7U0FDMUY7UUFDRDtZQUNFLElBQUksRUFBRSxhQUFhO1lBQ25CLFNBQVMsRUFBRSxZQUFZO1lBQ3ZCLFNBQVMsRUFBRSxNQUFNO1lBQ2pCLFFBQVEsRUFBRSxjQUFjO1lBQ3hCLFdBQVcsRUFBRSw4QkFBOEI7WUFDM0MsS0FBSyxFQUFFLGNBQWM7U0FDdEI7UUFFRDs7V0FFRztRQUNIO1lBQ0UsSUFBSSxFQUFFLFVBQVU7WUFDaEIsU0FBUyxFQUFFLGNBQWM7WUFDekIsU0FBUyxFQUFFLE1BQU07WUFDakIsUUFBUSxFQUFFLFVBQVU7WUFDcEIsV0FBVyxFQUFFLHdCQUF3QjtTQUN0QztLQUNGO0NBQ0YsQ0FBQyJ9