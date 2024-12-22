import {
  Values,
  StringMap,
  Page,
  Form,
  NavigationAction,
  Button,
  FilterAction,
  FormAction,
  Tabs,
  Tab,
  SaveAction,
  GetAction,
  MenuButton,
  Action,
  TableViewer,
  Panel,
  LeafComponent,
  FieldRendering,
  DataField,
  GridColumn,
  GridPage,
  ListPage,
  MasterPage,
  PageTemplate,
  SavePage,
  ViewPage,
  TableEditor,
  ValueRenderingDetails,
} from 'simplity-types';

export function generatePage(
  template: PageTemplate,
  form: Form,
  pages: StringMap<Page>
): number {
  const templateName = template.name;
  if (template.type === 'master') {
    //generate and add list, view and save pages
    let pageName = templateName + 'List';
    pages[pageName] = new Gen(
      toListPage(template as MasterPage),
      form
    ).generate();
    console.info(`page ${pageName} generated.`);

    pageName = templateName + 'View';
    pages[pageName] = new Gen(
      toViewPage(template as MasterPage),
      form
    ).generate();
    console.info(`page ${pageName} generated.`);

    pageName = templateName + 'Save';
    pages[pageName] = new Gen(
      toSavePage(template as MasterPage),
      form
    ).generate();
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
  /**
   * input parameter includes keys as well as additional ones.
   * key is made optional to allow save page to skip key fields.
   * boolean indicates whether the input is required or not
   */
  private inputParams: StringMap<boolean> = {};
  /**
   * all parameters: keys + additional
   */
  private allParams: Values = {};

  /**
   * only the additional params. Add page needs only these. (not the key fields)
   */
  private addParams: Values = {};
  /**
   * only the key fields. view
   */
  private keyParams: Values = {};
  private actions: { [key: string]: Action } = {};
  private buttons: Button[] = [];

  constructor(
    private template: PageTemplate,
    private form: Form
  ) {}
  generate(): Page {
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
        throw new Error(
          `Page template ${this.template.name} is of type ${this.template.type}.  No page generator is designed for this type.`
        );
    }
  }
  private doView(): Page {
    const t = this.template as ViewPage;

    this.actions = {
      get: {
        name: 'get',
        type: 'form',
        formOperation: 'get',
        formName: t.formName,
        params: this.keyParams,
      } as GetAction,
      close: {
        name: 'close',
        type: 'navigation',
        menuName: this.template.menuToGoBack,
      } as NavigationAction,
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
    let hiddenOnes: any = null;
    if (t.hideFields && t.hideFields.length) {
      hiddenOnes = {};
      for (const n of t.hideFields) {
        hiddenOnes[n] = true;
      }
    }

    let dataPanel: Panel | Tabs;
    if (t.tabs) {
      const tabs: Tab[] = [];
      for (const tab of t.tabs) {
        tabs.push({
          tabLabel: tab.label,
          icon: tab.icon,
          name: tab.name,
          compType: 'panel',
          useGridLayout: true,
          children: this.getChildArray(tab.fields, hiddenOnes),
        } as Tab);
      }
      dataPanel = {
        name: 'viewTabs',
        compType: 'tabs',
        children: tabs,
      } as Tabs;
    } else {
      dataPanel = {
        name: 'viewPanel',
        compType: 'panel',
        children: this.getChildArray(this.form.fieldNames, hiddenOnes),
      } as Panel;
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

  private addButtonAndAction(
    btn: MenuButton | undefined,
    actionName: string,
    params: Values
  ) {
    if (!btn) {
      return;
    }
    const b: Button = {
      name: btn.name,
      compType: 'button',
      buttonType: 'primary',
      onClick: actionName,
      label: btn.label,
      icon: btn.icon,
    };
    this.buttons.push(b);

    const a: NavigationAction = {
      name: actionName,
      type: 'navigation',
      menuName: btn.menuName,
      params,
    };
    this.actions[actionName] = a;
  }

  private getChildArray(
    names: string[] | undefined,
    hiddenFields: { [key: string]: true } | undefined,
    isEditable?: boolean
  ): DataField[] {
    const children: DataField[] = [];
    if (names === undefined) {
      return children;
    }

    for (const nam of names) {
      if (hiddenFields && hiddenFields[nam]) {
        continue;
      }
      const ff = this.form.fields[nam];
      if (!ff) {
        console.warn(
          `${nam} is declared as a field but it is not found in the form`
        );
        continue;
      }
      if (ff.renderAs && ff.renderAs !== 'hidden') {
        const field = { ...ff } as DataField;
        if (!isEditable) {
          field.renderAs = ff.listName ? 'select-output' : 'output';
        }

        children.push(field);
      }
    }

    return children;
  }

  private getColumnDetails(
    names: string[] | undefined,
    hiddenFields?: { [key: string]: true }
  ): ValueRenderingDetails[] {
    const details: ValueRenderingDetails[] = [];
    if (names === undefined || names.length == 0) {
      return this.getAllColumnDetails();
    }

    for (const name of names) {
      if (hiddenFields && hiddenFields[name]) {
        continue;
      }
      const ff = this.form.fields[name];
      if (!ff) {
        console.warn(
          `${name} is declared as a field but it is not found in the form`
        );
        continue;
      }
      if (ff.renderAs && ff.renderAs !== 'hidden') {
        const d: ValueRenderingDetails = {
          name,
          label: ff.label || ff.name,
          valueType: ff.valueType,
        };
        details.push(d);
      }
    }

    return details;
  }

  private getAllColumnDetails() {
    const details: ValueRenderingDetails[] = [];

    for (const [name, ff] of Object.entries(this.form.fields)) {
      if (ff.renderAs && ff.renderAs !== 'hidden') {
        const d: ValueRenderingDetails = {
          name,
          label: ff.label || ff.name,
          valueType: ff.valueType,
        };
        details.push(d);
      }
    }

    return details;
  }
  private getGridFields(columns: GridColumn[]): DataField[] {
    const f: DataField[] = [];
    for (const col of columns) {
      const ff = this.form.fields[col.name];
      let ft: FieldRendering = 'output';
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

  private doSave(): Page {
    const t = this.template as SavePage;
    this.actions = {
      get: {
        name: 'get',
        type: 'form',
        formOperation: 'get',
        formName: t.formName,
        params: this.keyParams,
      } as GetAction,
      save: {
        name: 'save',
        type: 'form',
        formOperation: 'save',
        onSuccess: 'close',
      } as SaveAction,
      cancel: {
        name: 'cancel',
        type: 'navigation',
        menuName: this.template.menuToGoBack,
        warnIfModified: true,
      } as NavigationAction,
      close: {
        name: 'close',
        type: 'navigation',
        menuName: this.template.menuToGoBack,
      } as NavigationAction,
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
    let hiddenOnes: any = null;
    if (t.hideFields && t.hideFields.length) {
      hiddenOnes = {};
      for (const n of t.hideFields) {
        hiddenOnes[n] = true;
      }
    }
    /**
     * all fields rendered in a card, unless we have tabs
     */
    let dataPanel: Tabs | Panel | undefined;
    if (t.tabs) {
      const tabs: Tab[] = [];
      for (const tab of t.tabs) {
        tabs.push({
          name: tab.name,
          compType: 'panel',

          tabLabel: tab.label,
          icon: tab.icon,
          useGridLayout: true,
          children: this.getChildArray(tab.fields, hiddenOnes, true),
        } as Tab);
      }
      dataPanel = {
        name: 'editTabs',
        compType: 'tabs',
        children: tabs,
      } as Tabs;
    } else {
      dataPanel = {
        name: 'editPanel',
        compType: 'panel',

        useGridLayout: true,
        children: this.getChildArray(this.form.fieldNames, hiddenOnes, true),
      } as Panel;
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

  private doList(): Page {
    const t = this.template as ListPage;
    /**
     * actions
     */
    this.actions.filter = {
      name: 'filter',
      type: 'form',
      formOperation: 'filter',
      childName: 'itemsList',
      filterParams: t.filterParams,
    } as FilterAction;

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

    const columns: ValueRenderingDetails[] = this.getColumnDetails(
      t.columnNames
    );

    const children: (Panel | TableViewer)[] = [];
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
    } as TableViewer);

    return {
      name: t.name,
      titlePrefix: t.label,
      serveGuests: this.form.serveGuests,
      onLoadActions:
        t.filterParams || t.allowConfiguration ? undefined : ['filter'],
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

  private doGrid(): Page {
    const t = this.template as GridPage;
    /**
     * actions
     */
    this.actions.getData = {
      name: 'getData',
      type: 'form',
      formOperation: 'get',
    } as FormAction;

    this.actions.submitData = {
      name: 'submitData',
      type: 'form',
      formOperation: 'save',
    } as FormAction;

    this.actions.cancel = {
      name: 'cancel',
      type: 'navigation',
    } as NavigationAction;
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

    const leaves: LeafComponent[] = this.getGridFields(t.columns);

    const children: (Panel | TableEditor)[] = [];

    children.push({
      name: t.gridName,
      compType: 'table',
      editable: true,
      formName: t.gridName,
      children: leaves,
    } as TableEditor);
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
  private addNavAction(name: string, params: Values | undefined): void {
    this.actions[name] = {
      type: 'navigation',
      name,
      menuName: name,
      params,
    } as NavigationAction;
  }
}

function toListPage(master: MasterPage): ListPage {
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
  } as ListPage;
}

function toSavePage(master: MasterPage): SavePage {
  return {
    name: master.name + 'Save',
    type: 'save',
    formName: master.formName,
    label: master.label + ' Details',
    hideFields: master.hideFields,
    menuToGoBack: master.name + 'List',
    additionalInputParams: master.additionalInputParams,
  } as SavePage;
}

function toViewPage(master: MasterPage): ViewPage {
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
  } as ViewPage;
}
