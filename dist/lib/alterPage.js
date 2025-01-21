"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alterPage = alterPage;
/**
 * attributes that we copy/override : simple ones
 */
const simpleAttributes = [
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
const mapAttributes = [
    'actions',
    'inputs',
];
/**
 * attributes that are array that we copy/override
 */
const arrAttributes = [
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
function alterPage(page, alts) {
    console.info(`page ${page.name} is going to be altered`);
    //step-1: copy simple attributes
    for (const attr of simpleAttributes) {
        const val = alts[attr];
        if (val !== undefined) {
            //@ts-expect-error  we are certainly copying the right value. How do we tell this to lint?
            page[attr] = val;
            console.info(`page.${attr} changed to ${val}`);
        }
    }
    // step-2: add/replace (and NOT merge) maps. No feature to remove an entry
    for (const attr of mapAttributes) {
        const src = alts[attr];
        if (src == undefined) {
            continue;
        }
        console.info(`objects will be added/replaced for page[${attr}] `);
        let target = page[attr];
        if (!target) {
            target = {};
            page[attr] = target;
        }
        for (const [name, obj] of Object.entries(src)) {
            target[name] = copyOf(obj);
        }
    }
    // step-3: append arrays. no feature to remove an entry
    for (const attr of arrAttributes) {
        const src = alts[attr];
        if (src === undefined) {
            continue;
        }
        console.info(`values will be appended to page[${attr}] `);
        let target = page[attr];
        if (target === undefined) {
            target = [];
            //@ts-expect-error generic code
            page[attr] = target;
        }
        for (const a of src) {
            console.info(`${a} appended`);
            target.push(a);
        }
    }
    /**
     * alteration to the component tree
     */
    const childComps = page.dataPanel?.children;
    if (!childComps) {
        console.info(`Page has no components inside it dataPanel. No alterations processed for child components`);
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
function alterChildren(parent, alts, nbrTasks) {
    const parentName = parent.name;
    const comps = [];
    for (const child of parent.children) {
        if (nbrTasks < 1) {
            comps.push(child);
            continue;
        }
        const childName = child.name;
        const toDelete = alts.deletions ? alts.deletions[childName] : false;
        const anUpdate = alts.changes && alts.changes[childName];
        if (toDelete) {
            if (anUpdate) {
                console.warn(`Element ${parentName} specifies that its child element ${childName} be altered, but it also specifies that it should be deleted. deletion command ignored.`);
                nbrTasks--;
            }
            else {
                console.info(`Child element ${childName} deleted`);
                nbrTasks--;
                continue;
            }
        }
        if (anUpdate) {
            for (const [attName, value] of Object.entries(anUpdate)) {
                //@ts-ignore  this is a generic code for type-safety is traded-off
                child[attName] = value;
                console.info(`${childName}.${attName} got modified`);
            }
            nbrTasks--;
        }
        const anAdd = alts.additions && alts.additions[childName];
        const compsToAdd = anAdd && anAdd.comps;
        const nbrToAdd = compsToAdd && compsToAdd.length;
        let alreadyPushed = false;
        if (nbrToAdd) {
            const toInsert = anAdd.insertBefore;
            console.info(`Going to add components ${toInsert ? 'before' : 'after'} ${childName} `);
            if (!toInsert) {
                comps.push(child);
                alreadyPushed = true;
            }
            for (const c of compsToAdd) {
                comps.push(c);
                console.info(`${c.name} added`);
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
        if (child.children) {
            nbrTasks = alterChildren(child, alts, nbrTasks);
        }
    }
    parent.children = comps;
    return nbrTasks;
}
function copyOf(field) {
    const obj = {};
    for (const [name, value] of Object.entries(field)) {
        obj[name] = value;
    }
    return obj;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWx0ZXJQYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9hbHRlclBhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUE4Q0EsOEJBdUZDO0FBN0hEOztHQUVHO0FBQ0gsTUFBTSxnQkFBZ0IsR0FBMEM7SUFDOUQsVUFBVTtJQUNWLFlBQVk7SUFDWixhQUFhO0lBQ2IsWUFBWTtJQUNaLGFBQWE7SUFDYixVQUFVO0lBQ1YsYUFBYTtJQUNiLGtCQUFrQjtJQUNsQixhQUFhO0lBQ2IsZUFBZTtDQUNoQixDQUFDO0FBQ0Y7O0dBRUc7QUFDSCxNQUFNLGFBQWEsR0FBMEM7SUFDM0QsU0FBUztJQUNULFFBQVE7Q0FDVCxDQUFDO0FBQ0Y7O0dBRUc7QUFDSCxNQUFNLGFBQWEsR0FBMEM7SUFDM0QsZUFBZTtJQUNmLFVBQVU7SUFDVixhQUFhO0lBQ2IsZUFBZTtJQUNmLGNBQWM7Q0FDZixDQUFDO0FBRUY7Ozs7R0FJRztBQUNILFNBQWdCLFNBQVMsQ0FBQyxJQUFVLEVBQUUsSUFBb0I7SUFDeEQsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxJQUFJLHlCQUF5QixDQUFDLENBQUM7SUFFekQsZ0NBQWdDO0lBQ2hDLEtBQUssTUFBTSxJQUFJLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztRQUNwQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkIsSUFBSSxHQUFHLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdEIsMEZBQTBGO1lBQzFGLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksZUFBZSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELENBQUM7SUFDSCxDQUFDO0lBRUQsMEVBQTBFO0lBQzFFLEtBQUssTUFBTSxJQUFJLElBQUksYUFBYSxFQUFFLENBQUM7UUFDakMsTUFBTSxHQUFHLEdBQUcsSUFB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