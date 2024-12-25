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
                formName: t.formName,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVQYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9nZW5lcmF0ZVBhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUE4QkEsb0NBa0RDO0FBbERELFNBQWdCLFlBQVksQ0FDMUIsUUFBc0IsRUFDdEIsSUFBVSxFQUNWLEtBQXNCO0lBRXRCLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7SUFDbkMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQ1osSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQy9CLDRDQUE0QztRQUU1QyxJQUFJLFFBQVEsR0FBRyxZQUFZLEdBQUcsTUFBTSxDQUFDO1FBQ3JDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDeEQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUN2QixVQUFVLENBQUMsUUFBc0IsQ0FBQyxFQUNsQyxJQUFJLENBQ0wsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxRQUFRLGFBQWEsQ0FBQyxDQUFDO1lBQzVDLEdBQUcsRUFBRSxDQUFDO1FBQ1IsQ0FBQztRQUVELFFBQVEsR0FBRyxZQUFZLEdBQUcsTUFBTSxDQUFDO1FBQ2pDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDeEQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUN2QixVQUFVLENBQUMsUUFBc0IsQ0FBQyxFQUNsQyxJQUFJLENBQ0wsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxRQUFRLGFBQWEsQ0FBQyxDQUFDO1lBQzVDLEdBQUcsRUFBRSxDQUFDO1FBQ1Is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