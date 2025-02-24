import {
  Page,
  ContainerComponent,
  PageAlteration,
  StringMap,
  PageComponent,
} from 'simplity-types';

/**
 * attributes that we copy/override : simple ones
 */
const simpleAttributes: (keyof Page & keyof PageAlteration)[] = [
  'formName',
  'isEditable',
  'titlePrefix',
  'titleField',
  'titleSuffix',
  'hideMenu',
  'hideModules',
  'inputIsForUpdate',
  'serveGuests',
  'onCloseAction',
];
/**
 * attributes that are maps that we copy/override
 */
const mapAttributes: (keyof Page & keyof PageAlteration)[] = [
  'actions',
  'inputs',
];
/**
 * attributes that are array that we copy/override
 */
const arrAttributes: (keyof Page & keyof PageAlteration)[] = [
  'onLoadActions',
  'triggers',
  'leftButtons',
  'middleButtons',
  'rightButtons',
];

/**
 * alter a page as per alteration specifications
 * @param pageToAlter received as any to avoid the compile time error with readonly check
 * @param alterations
 */
export function alterPage(page: Page, alts: PageAlteration): void {
  //console.info(`page ${page.name} is going to be altered`);

  //step-1: copy simple attributes
  for (const attr of simpleAttributes) {
    const val = alts[attr];
    if (val !== undefined) {
      //@ts-expect-error  we are certainly copying the right value. How do we tell this to lint?
      page[attr] = val;
    }
  }

  // step-2: add/replace (and NOT merge) maps. No feature to remove an entry
  for (const attr of mapAttributes) {
    const src = alts[attr] as StringMap<unknown>;
    if (src == undefined) {
      continue;
    }

    let target = page[attr] as StringMap<unknown>;
    if (!target) {
      target = {};
      (page[attr] as StringMap<unknown>) = target;
    }
    for (const [name, obj] of Object.entries(src)) {
      target[name] = copyOf(obj as object);
    }
  }

  // step-3: append arrays. no feature to remove an entry
  for (const attr of arrAttributes) {
    const src = alts[attr] as unknown[];
    if (src === undefined) {
      continue;
    }

    let target = page[attr] as unknown[];
    if (target === undefined) {
      target = [];
      //@ts-expect-error generic code
      page[attr] = target;
    }

    for (const a of src) {
      target.push(a);
    }
  }

  /**
   * alteration to the component tree
   */
  const childComps = page.dataPanel?.children;
  if (!childComps) {
    return;
  }
  /**
   * nbr of alterations are small compared to the total number of child-nodes under a panel.
   * Hence we keep track of number of tasks to stop going down the tree once we are done.
   */
  let nbrTasks = 0;

  const adds = alts.additions;
  if (adds) {
    nbrTasks += Object.keys(adds).length;
  }

  const updates = alts.changes;
  if (updates) {
    nbrTasks += Object.keys(updates).length;
  }

  //step-6: deletions
  let deletes = alts.deletions;
  if (deletes) {
    nbrTasks += Object.keys(deletes).length;
  }

  if (nbrTasks > 0) {
    alterChildren(page.dataPanel, alts, nbrTasks);
  }
}

function alterChildren(
  parent: ContainerComponent,
  alts: PageAlteration,
  nbrTasks: number
): number {
  const parentName = parent.name;
  const comps: PageComponent[] = [];
  for (const child of parent.children!) {
    if (nbrTasks < 1) {
      comps.push(child);
      continue;
    }

    const childName = child.name;
    const toDelete = alts.deletions ? alts.deletions[childName] : false;
    const anUpdate = alts.changes && alts.changes[childName];

    if (toDelete) {
      if (anUpdate) {
        console.warn(
          `Warning: Element ${parentName} specifies that its child element ${childName} be altered, but it also specifies that it should be deleted. deletion command ignored.`
        );
        nbrTasks--;
      } else {
        nbrTasks--;
        continue;
      }
    }

    if (anUpdate) {
      for (const [attName, value] of Object.entries(anUpdate)) {
        //@ts-ignore  this is a generic code for type-safety is traded-off
        child[attName] = value;
      }
      nbrTasks--;
    }

    const anAdd = alts.additions && alts.additions[childName];
    const compsToAdd = anAdd && anAdd.comps;
    const nbrToAdd = compsToAdd && compsToAdd.length;
    let alreadyPushed = false;
    if (nbrToAdd) {
      const toInsert = anAdd.insertBefore;

      if (!toInsert) {
        comps.push(child);
        alreadyPushed = true;
      }

      for (const c of compsToAdd) {
        comps.push(c);
      }
      nbrTasks--;
    }
    if (!alreadyPushed) {
      comps.push(child);
    }

    /**
     * is this child a container?
     * in which case we have to look for alterations of its children, recursively
     */
    if ((child as ContainerComponent).children) {
      nbrTasks = alterChildren(child as ContainerComponent, alts, nbrTasks);
    }
  }

  parent.children = comps;
  return nbrTasks;
}

function copyOf(field: object): object {
  const obj = {} as any;
  for (const [name, value] of Object.entries(field)) {
    obj[name] = value;
  }
  return obj;
}
