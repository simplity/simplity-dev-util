export function generatePage(template, form, pages) {
    const templateName = template.name;
    let nbr = 0;
    if (template.type === 'master') {
        //generate and add list, view and save pages
        let pageName = templateName + 'List';
        if (pageExists(pageName, pages, templateName) === false) {
            pages[pageName] = new Gen(toListPage(template), form).generate();
            nbr++;
        }
        pageName = templateName + 'View';
        if (pageExists(pageName, pages, templateName) === false) {
            pages[pageName] = new Gen(toViewPage(template), form).generate();
            nbr++;
        }
        pageName = templateName + 'Save';
        if (pageExists(pageName, pages, templateName) === false) {
            pages[pageName] = new Gen(toSavePage(template), form).generate();
            nbr++;
        }
        return nbr;
    }
    if (pageExists(templateName, pages)) {
        return 0;
    }
    pages[templateName] = new Gen(template, form).generate();
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
    console.error('Error:' + msg);
    return true;
}
/**
 * generator that can generate different types of pages from a template
 */
class Gen {
    template;
    form;
    /**
     * input parameter includes keys as well as additional ones.
     * key is made optional to allow save page to skip key fields.
     * boolean indicates whether the input is required or not
     */
    inputParams = {};
    /**
     * all parameters: keys + additional
     */
    allParams = {};
    /**
     * only the additional params. Add page needs only these. (not the key fields)
     */
    addParams = {};
    /**
     * only the key fields. view
     */
    keyParams = {};
    actions = {};
    buttons = [];
    constructor(template, form) {
        this.template = template;
        this.form = form;
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
                console.error(`Error: ${nam} is declared as a field but it is not found in the form`);
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
                console.error(`Error: ${name} is declared as a field but it is not found in the form`);
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
            targetTableName: 'itemsList',
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
//# sourceMappingURL=generatePage.js.map