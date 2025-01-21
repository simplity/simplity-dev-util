"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePage = generatePage;
function generatePage(template, form, pages) {
    const templateName = template.name;
    let nbr = 0;
    if (template.type === 'master') {
        //generate and add list, view and save pages
        let pageName = templateName + 'List';
        if (pageExists(pageName, pages, templateName) === false) {
            pages[pageName] = new Gen(toListPage(template), form).generate();
            console.info(`page ${pageName} generated.`);
            nbr++;
        }
        pageName = templateName + 'View';
        if (pageExists(pageName, pages, templateName) === false) {
            pages[pageName] = new Gen(toViewPage(template), form).generate();
            console.info(`page ${pageName} generated.`);
            nbr++;
        }
        pageName = templateName + 'Save';
        if (pageExists(pageName, pages, templateName) === false) {
            pages[pageName] = new Gen(toSavePage(template), form).generate();
            console.info(`page ${pageName} generated.`);
            nbr++;
        }
        return nbr;
    }
    if (pageExists(templateName, pages)) {
        return 0;
    }
    pages[templateName] = new Gen(template, form).generate();
    console.info(`page ${templateName} generated.`);
    return 1;
}
function pageExists(name, pages, masterName) {
    if (!pages[name]) {
        return false;
    }
    let msg = `A page with name ${name} is defined in the pages folder.`;
    if (masterName) {
        msg += `\nA master template named ${masterName} is defined in the templates folder, that would generate a page with the same name`;
    }
    else {
        msg += `\nA template with the same name is also defined in the templates folder.`;
    }
    msg += `\nPage generated with the template is ignored, and the page you have defined in the pages folder is retained`;
    console.error(msg);
    return true;
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
                this.keyParams[key] = true;
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
                menuItem: this.template.menuToGoBack,
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
            menuItem: btn.menuItem,
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
                formName: t.formName,
                onSuccess: 'close',
            },
            cancel: {
                name: 'cancel',
                type: 'navigation',
                menuItem: this.template.menuToGoBack,
                warnIfModified: true,
            },
            close: {
                name: 'close',
                type: 'navigation',
                menuItem: this.template.menuToGoBack,
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
            formName: t.formName,
            childName: 'itemsList',
            filterFields: t.filterFields,
        };
        if (t.onRowClickMenu) {
            this.addNavAction(t.onRowClickMenu, this.allParams);
        }
        if (t.rowActionMenus) {
            for (const menuItem of Object.keys(t.rowActionMenus)) {
                this.addNavAction(menuItem, this.allParams);
            }
        }
        /**
         * buttons
         */
        if (t.newButton) {
            //new button with onClick action as masterAdd
            const nb = t.newButton;
            this.addNavAction(nb.menuItem, this.addParams);
            this.buttons.push({
                name: 'newButton',
                compType: 'button',
                buttonType: 'navigation',
                label: nb.label,
                icon: nb.icon,
                onClick: nb.menuItem, //action name same as menu name
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
            onLoadActions: t.filterFields || t.allowConfiguration ? undefined : ['filter'],
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
            formName: t.formName,
        };
        this.actions.submitData = {
            name: 'submitData',
            type: 'form',
            formOperation: 'save',
            formName: t.formName,
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
            onLoadActions: t.filterFields ? undefined : ['getData'],
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
            menuItem: name,
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
        filterFields: master.filterFields,
        /**
         * TODO: convert this to the vertical dots notation
         */
        /*
        clickableElements: [
          {
            name: 'viewButton',
            label: 'VIEW',
            menuItem: master.name + 'View',
          },
          {
            name: 'editButton',
            label: 'EDIT',
            menuItem: master.name + 'Edit',
          },
        ],
        */
        newButton: {
            name: 'newButton',
            label: 'ADD ' + master.label.toUpperCase(),
            menuItem: master.name + 'Add',
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
            menuItem: master.name + 'Edit',
            label: 'Edit',
        },
        createButton: {
            name: 'addButton',
            menuItem: master.name + 'Add',
            label: 'New ' + master.label,
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVQYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9nZW5lcmF0ZVBhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUEyQkEsb0NBa0RDO0FBbERELFNBQWdCLFlBQVksQ0FDMUIsUUFBc0IsRUFDdEIsSUFBVSxFQUNWLEtBQXNCO0lBRXRCLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7SUFDbkMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQ1osSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQy9CLDRDQUE0QztRQUU1QyxJQUFJLFFBQVEsR0FBRyxZQUFZLEdBQUcsTUFBTSxDQUFDO1FBQ3JDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDeEQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUN2QixVQUFVLENBQUMsUUFBc0IsQ0FBQyxFQUNsQyxJQUFJLENBQ0wsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxRQUFRLGFBQWEsQ0FBQyxDQUFDO1lBQzVDLEdBQUcsRUFBRSxDQUFDO1FBQ1IsQ0FBQztRQUVELFFBQVEsR0FBRyxZQUFZLEdBQUcsTUFBTSxDQUFDO1FBQ2pDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDeEQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUN2QixVQUFVLENBQUMsUUFBc0IsQ0FBQyxFQUNsQyxJQUFJLENBQ0wsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxRQUFRLGFBQWEsQ0FBQyxDQUFDO1lBQzVDLEdBQUcsRUFBRSxDQUFDO1FBQ1Is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