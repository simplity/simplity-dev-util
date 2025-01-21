"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._filters = void 0;
exports._filters = {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX2ZpbHRlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGliL3N5c3RlbVJlc291cmNlcy9yZWMvX2ZpbHRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRWEsUUFBQSxRQUFRLEdBQWlCO0lBQ3BDLElBQUksRUFBRSxVQUFVO0lBQ2hCLGlCQUFpQixFQUFFLElBQUk7SUFDdkIsVUFBVSxFQUFFLFFBQVE7SUFDcEIsV0FBVyxFQUFFLGlDQUFpQztJQUM5QyxNQUFNLEVBQUU7UUFDTjtZQUNFLElBQUksRUFBRSxNQUFNO1lBQ1osU0FBUyxFQUFFLGNBQWM7WUFDekIsU0FBUyxFQUFFLE1BQU07WUFDakIsS0FBSyxFQUFFLE1BQU07U0FDZDtRQUNEO1lBQ0UsSUFBSSxFQUFFLFlBQVk7WUFDbEIsU0FBUyxFQUFFLGNBQWM7WUFDekIsU0FBUyxFQUFFLE1BQU07WUFDakIsS0FBSyxFQUFFLFdBQVc7U0FDbkI7UUFDRCxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFO1FBQy9ELEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUU7S0FDbEU7Q0FDRixDQUFDIn0=