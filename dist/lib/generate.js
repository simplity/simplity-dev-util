"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePage = generatePage;
function generatePage(template, form, pages) {
    const templateName = template.name;
    if (template.type === 'master') {
        //generate and add list, view and save pages
        let pageName = templateName + 'List';
        pages[pageName] = new Gen(toListPage(template), form).generate();
        console.info(`page ${pageName} generated.`);
        pageName = templateName + 'View';
        pages[pageName] = new Gen(toViewPage(template), form).generate();
        console.info(`page ${pageName} generated.`);
        pageName = templateName + 'Save';
        pages[pageName] = new Gen(toSavePage(template), form).generate();
        console.info(`page ${pageName} generated.`);
        return 3;
    }
    pages[templateName] = new Gen(template, form).generate();
    console.info(`page ${templateName} generated.`);
    return 1;
}
/**
 * generator that can generate different types of pages from a template
 */
class Gen {
    constructor(template, form) {
        this.template = template;
        this.form = form;
        /**
         * input parameter includes keys as well as additional ones.
         * key is made optional to allow save page to skip key fields.
         * boolean indicates whether the input is required or not
         */
        this.inputParams = {};
        /**
         * all parameters: keys + additional
         */
        this.allParams = {};
        /**
         * only the additional params. Add page needs only these. (not the key fields)
         */
        this.addParams = {};
        /**
         * only the key fields. view
         */
        this.keyParams = {};
        this.actions = {};
        this.buttons = [];
    }
    generate() {
        this.inputParams = {};
        this.allParams = {};
        this.addParams = {};
        this.keyParams = {};
        const fields = this.form.keyFields;
        if (fields) {
            for (const key of fields) {
                this.inputParams[key] = true;
                this.allParams[key] = '$' + key;
                this.keyParams[key] = '$' + key;
            }
        }
        const t = this.template.additionalInputParams;
        if (t) {
            for (const key of Object.keys(t)) {
                this.inputParams[key] = t[key];
                this.allParams[key] = '$' + key;
                this.addParams[key] = '$' + key;
            }
        }
        this.actions = {};
        this.buttons = [];
        switch (this.template.type) {
            case 'list':
                return this.doList();
            case 'grid':
                return this.doGrid();
            case 'save':
                return this.doSave();
            case 'view':
                return this.doView();
            default:
                throw new Error(`Page template ${this.template.name} is of type ${this.template.type}.  No page generator is designed for this type.`);
        }
    }
    doView() {
        const t = this.template;
        this.actions = {
            get: {
                name: 'get',
                type: 'form',
                formOperation: 'get',
                formName: t.formName,
                params: this.keyParams,
            },
            close: {
                name: 'close',
                type: 'navigation',
                menuName: this.template.menuToGoBack,
            },
        };
        this.buttons.push({
            name: 'closeButton',
            compType: 'button',
            buttonType: 'secondary',
            onClick: 'close',
            label: 'Close',
        });
        this.addButtonAndAction(t.editButton, 'edit', this.allParams);
        this.addButtonAndAction(t.createButton, 'add', this.addParams);
        /**
         * all fields are rendered in a Panel, unless we have tabs
         */
        let hiddenOnes = null;
        if (t.hideFields && t.hideFields.length) {
            hiddenOnes = {};
            for (const n of t.hideFields) {
                hiddenOnes[n] = true;
            }
        }
        let dataPanel;
        if (t.tabs) {
            const tabs = [];
            for (const tab of t.tabs) {
                tabs.push({
                    tabLabel: tab.label,
                    icon: tab.icon,
                    name: tab.name,
                    compType: 'panel',
                    useGridLayout: true,
                    children: this.getChildArray(tab.fields, hiddenOnes),
                });
            }
            dataPanel = {
                name: 'viewTabs',
                compType: 'tabs',
                children: tabs,
            };
        }
        else {
            dataPanel = {
                name: 'viewPanel',
                compType: 'panel',
                children: this.getChildArray(this.form.fieldNames, hiddenOnes),
            };
        }
        return {
            name: t.name,
            formName: t.formName,
            titlePrefix: t.label,
            serveGuests: this.form.serveGuests,
            inputs: this.inputParams,
            onLoadActions: ['get'],
            actions: this.actions,
            middleButtons: this.buttons,
            dataPanel: {
                name: 'dataPanel',
                compType: 'panel',
                children: [dataPanel],
            },
        };
    }
    addButtonAndAction(btn, actionName, params) {
        if (!btn) {
            return;
        }
        const b = {
            name: btn.name,
            compType: 'button',
            buttonType: 'primary',
            onClick: actionName,
            label: btn.label,
            icon: btn.icon,
        };
        this.buttons.push(b);
        const a = {
            name: actionName,
            type: 'navigation',
            menuName: btn.menuName,
            params,
        };
        this.actions[actionName] = a;
    }
    getChildArray(names, hiddenFields, isEditable) {
        const children = [];
        if (names === undefined) {
            return children;
        }
        for (const nam of names) {
            if (hiddenFields && hiddenFields[nam]) {
                continue;
            }
            const ff = this.form.fields[nam];
            if (!ff) {
                console.warn(`${nam} is declared as a field but it is not found in the form`);
                continue;
            }
            if (ff.renderAs && ff.renderAs !== 'hidden') {
                const field = { ...ff };
                if (!isEditable) {
                    field.renderAs = ff.listName ? 'select-output' : 'output';
                }
                children.push(field);
            }
        }
        return children;
    }
    getColumnDetails(names, hiddenFields) {
        const details = [];
        if (names === undefined || names.length == 0) {
            return this.getAllColumnDetails();
        }
        for (const name of names) {
            if (hiddenFields && hiddenFields[name]) {
                continue;
            }
            const ff = this.form.fields[name];
            if (!ff) {
                console.warn(`${name} is declared as a field but it is not found in the form`);
                continue;
            }
            if (ff.renderAs && ff.renderAs !== 'hidden') {
                const d = {
                    name,
                    label: ff.label || ff.name,
                    valueType: ff.valueType,
                };
                details.push(d);
            }
        }
        return details;
    }
    getAllColumnDetails() {
        const details = [];
        for (const [name, ff] of Object.entries(this.form.fields)) {
            if (ff.renderAs && ff.renderAs !== 'hidden') {
                const d = {
                    name,
                    label: ff.label || ff.name,
                    valueType: ff.valueType,
                };
                details.push(d);
            }
        }
        return details;
    }
    getGridFields(columns) {
        const f = [];
        for (const col of columns) {
            const ff = this.form.fields[col.name];
            let ft = 'output';
            if (col.isEditable) {
                if (ff.renderAs && ff.renderAs !== 'hidden') {
                    ft = ff.renderAs;
                }
            }
            f.push({
                name: ff.name,
                compType: 'field',
                renderAs: ft,
                isRequired: ff.isRequired,
                valueSchema: ff.valueSchema,
                valueType: ff.valueType,
                width: ff.width,
                label: ff.label,
            });
        }
        return f;
    }
    doSave() {
        const t = this.template;
        this.actions = {
            get: {
                name: 'get',
                type: 'form',
                formOperation: 'get',
                formName: t.formName,
                params: this.keyParams,
            },
            save: {
                name: 'save',
                type: 'form',
                formOperation: 'save',
                onSuccess: 'close',
            },
            cancel: {
                name: 'cancel',
                type: 'navigation',
                menuName: this.template.menuToGoBack,
                warnIfModified: true,
            },
            close: {
                name: 'close',
                type: 'navigation',
                menuName: this.template.menuToGoBack,
            },
        };
        this.buttons = [
            {
                name: 'cancelButton',
                compType: 'button',
                buttonType: 'secondary',
                onClick: 'cancel',
                label: 'Cancel',
                tooltip: 'Abandon Changes',
            },
            {
                name: 'saveButton',
                compType: 'button',
                buttonType: 'primary',
                onClick: 'save',
                label: 'Save',
                enableWhen: 'valid',
            },
        ];
        let hiddenOnes = null;
        if (t.hideFields && t.hideFields.length) {
            hiddenOnes = {};
            for (const n of t.hideFields) {
                hiddenOnes[n] = true;
            }
        }
        /**
         * all fields rendered in a card, unless we have tabs
         */
        let dataPanel;
        if (t.tabs) {
            const tabs = [];
            for (const tab of t.tabs) {
                tabs.push({
                    name: tab.name,
                    compType: 'panel',
                    tabLabel: tab.label,
                    icon: tab.icon,
                    useGridLayout: true,
                    children: this.getChildArray(tab.fields, hiddenOnes, true),
                });
            }
            dataPanel = {
                name: 'editTabs',
                compType: 'tabs',
                children: tabs,
            };
        }
        else {
            dataPanel = {
                name: 'editPanel',
                compType: 'panel',
                useGridLayout: true,
                children: this.getChildArray(this.form.fieldNames, hiddenOnes, true),
            };
        }
        return {
            name: t.name,
            formName: t.formName,
            titlePrefix: t.label,
            serveGuests: this.form.serveGuests,
            isEditable: true,
            hideModules: true,
            hideMenu: true,
            inputs: this.inputParams,
            inputIsForUpdate: true,
            onLoadActions: ['get'],
            actions: this.actions,
            middleButtons: this.buttons,
            dataPanel: {
                name: 'dataPanel',
                compType: 'panel',
                children: [dataPanel],
            },
        };
    }
    doList() {
        const t = this.template;
        /**
         * actions
         */
        this.actions.filter = {
            name: 'filter',
            type: 'form',
            formOperation: 'filter',
            childName: 'itemsList',
            filterParams: t.filterParams,
        };
        if (t.onRowClickMenu) {
            this.addNavAction(t.onRowClickMenu, this.allParams);
        }
        if (t.rowActionMenus) {
            for (const menuName of Object.keys(t.rowActionMenus)) {
                this.addNavAction(menuName, this.allParams);
            }
        }
        /**
         * buttons
         */
        if (t.newButton) {
            //new button with onClick action as masterAdd
            const nb = t.newButton;
            this.addNavAction(nb.menuName, this.addParams);
            this.buttons.push({
                name: 'newButton',
                compType: 'button',
                buttonType: 'navigation',
                label: nb.label,
                icon: nb.icon,
                onClick: nb.menuName, //action name same as menu name
            });
        }
        const columns = this.getColumnDetails(t.columnNames);
        const children = [];
        children.push({
            name: 'itemsList',
            compType: 'table',
            reportName: t.formName,
            configurable: !!t.allowConfiguration,
            searchable: true,
            sortable: true,
            editable: false,
            formName: t.formName,
            onRowClick: t.onRowClickMenu,
            rowActions: t.rowActionMenus,
            columns,
        });
        return {
            name: t.name,
            titlePrefix: t.label,
            serveGuests: this.form.serveGuests,
            onLoadActions: t.filterParams || t.allowConfiguration ? undefined : ['filter'],
            actions: this.actions,
            middleButtons: this.buttons,
            hideModules: false,
            hideMenu: false,
            formName: t.formName,
            renderButtonsBeforeData: true,
            dataPanel: {
                name: 'dataPanel',
                compType: 'panel',
                children,
            },
        };
    }
    doGrid() {
        const t = this.template;
        /**
         * actions
         */
        this.actions.getData = {
            name: 'getData',
            type: 'form',
            formOperation: 'get',
        };
        this.actions.submitData = {
            name: 'submitData',
            type: 'form',
            formOperation: 'save',
        };
        this.actions.cancel = {
            name: 'cancel',
            type: 'navigation',
        };
        /**
         * buttons
         */
        /*
        const buttons: Button[] = [
          {
            name: 'cancelButton',
            compType: 'button',
            buttonType: 'secondary',
            onClick: 'cancel',
            label: 'Cancel',
          },
          {
            name: 'submitButton',
            compType: 'button',
            buttonType: 'primary',
            onClick: 'submitData',
            label: 'Save Changes',
          },
         ];
         */
        const leaves = this.getGridFields(t.columns);
        const children = [];
        children.push({
            name: t.gridName,
            compType: 'table',
            editable: true,
            formName: t.gridName,
            children: leaves,
        });
        return {
            name: t.name,
            formName: t.formName,
            titlePrefix: t.label,
            serveGuests: this.form.serveGuests,
            onLoadActions: t.filterParams ? undefined : ['getData'],
            actions: this.actions,
            middleButtons: this.buttons,
            hideModules: false,
            hideMenu: false,
            dataPanel: {
                name: 'dataPanel',
                compType: 'panel',
                children,
            },
        };
    }
    addNavAction(name, params) {
        this.actions[name] = {
            type: 'navigation',
            name,
            menuName: name,
            params,
        };
    }
}
function toListPage(master) {
    return {
        name: master.name + 'List',
        type: 'list',
        formName: master.listFormName || master.formName,
        label: master.label + ' List',
        columnNames: master.columnNames,
        additionalInputParams: master.additionalInputParams,
        filterParams: master.filterParams,
        /**
         * TODO: convert this to the vertical dots notation
         */
        /*
        clickableElements: [
          {
            name: 'viewButton',
            label: 'VIEW',
            menuName: master.name + 'View',
          },
          {
            name: 'editButton',
            label: 'EDIT',
            menuName: master.name + 'Edit',
          },
        ],
        */
        newButton: {
            name: 'newButton',
            label: 'ADD ' + master.label.toUpperCase(),
            menuName: master.name + 'Add',
        },
        onRowClickMenu: master.name + 'View',
        renderButtonsBeforeData: true,
    };
}
function toSavePage(master) {
    return {
        name: master.name + 'Save',
        type: 'save',
        formName: master.formName,
        label: master.label + ' Details',
        hideFields: master.hideFields,
        menuToGoBack: master.name + 'List',
        additionalInputParams: master.additionalInputParams,
    };
}
function toViewPage(master) {
    return {
        name: master.name + 'View',
        type: 'view',
        formName: master.viewFormName || master.formName,
        label: master.label + ' Details',
        hideFields: master.hideFields,
        additionalInputParams: master.additionalInputParams,
        menuToGoBack: master.name + 'List',
        editButton: {
            name: 'editButton',
            menuName: master.name + 'Edit',
            label: 'Edit',
        },
        createButton: {
            name: 'addButton',
            menuName: master.name + 'Add',
            label: 'New ' + master.label,
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL2dlbmVyYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBK0JBLG9DQW1DQztBQW5DRCxTQUFnQixZQUFZLENBQzFCLFFBQXNCLEVBQ3RCLElBQVUsRUFDVixLQUFzQjtJQUV0QixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO0lBQ25DLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMvQiw0Q0FBNEM7UUFDNUMsSUFBSSxRQUFRLEdBQUcsWUFBWSxHQUFHLE1BQU0sQ0FBQztRQUNyQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQ3ZCLFVBQVUsQ0FBQyxRQUFzQixDQUFDLEVBQ2xDLElBQUksQ0FDTCxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLFFBQVEsYUFBYSxDQUFDLENBQUM7UUFFNUMsUUFBUSxHQUFHLFlBQVksR0FBRyxNQUFNLENBQUM7UUFDakMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUN2QixVQUFVLENBQUMsUUFBc0IsQ0FBQyxFQUNsQyxJQUFJLENBQ0wsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxRQUFRLGFBQWEsQ0FBQyxDQUFDO1FBRTVDLFFBQVEsR0FBRyxZQUFZLEdBQUcsTUFBTSxDQUFDO1FBQ2pDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FDdkIsVUFBVSxDQUFDLFFBQXNCLENBQUMsRUFDbEMsSUFBSSxDQUNMLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDYixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsUUFBUSxhQUFhLENBQUMsQ0FBQztRQUU1QyxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFRCxLQUFLLENBQUMs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