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
        return true;
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
    return false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVQYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9nZW5lcmF0ZVBhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUErQkEsb0NBa0RDO0FBbERELFNBQWdCLFlBQVksQ0FDMUIsUUFBc0IsRUFDdEIsSUFBVSxFQUNWLEtBQXNCO0lBRXRCLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7SUFDbkMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQ1osSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQy9CLDRDQUE0QztRQUU1QyxJQUFJLFFBQVEsR0FBRyxZQUFZLEdBQUcsTUFBTSxDQUFDO1FBQ3JDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDeEQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUN2QixVQUFVLENBQUMsUUFBc0IsQ0FBQyxFQUNsQyxJQUFJLENBQ0wsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxRQUFRLGFBQWEsQ0FBQyxDQUFDO1lBQzVDLEdBQUcsRUFBRSxDQUFDO1FBQ1IsQ0FBQztRQUVELFFBQVEsR0FBRyxZQUFZLEdBQUcsTUFBTSxDQUFDO1FBQ2pDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDeEQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUN2QixVQUFVLENBQUMsUUFBc0IsQ0FBQyxFQUNsQyxJQUFJLENBQ0wsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxRQUFRLGFBQWEsQ0FBQyxDQUFDO1lBQzVDLEdBQUcsRUFBRSxDQUFDO1FBQ1Is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