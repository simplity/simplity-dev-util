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
         * in which case we have to look for alterations of its chidren, recursively
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWx0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL2FsdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBOENBLDhCQXVGQztBQTdIRDs7R0FFRztBQUNILE1BQU0sZ0JBQWdCLEdBQTBDO0lBQzlELFVBQVU7SUFDVixZQUFZO0lBQ1osYUFBYTtJQUNiLFlBQVk7SUFDWixhQUFhO0lBQ2IsVUFBVTtJQUNWLGFBQWE7SUFDYixrQkFBa0I7SUFDbEIsYUFBYTtJQUNiLGVBQWU7Q0FDaEIsQ0FBQztBQUNGOztHQUVHO0FBQ0gsTUFBTSxhQUFhLEdBQTBDO0lBQzNELFNBQVM7SUFDVCxRQUFRO0NBQ1QsQ0FBQztBQUNGOztHQUVHO0FBQ0gsTUFBTSxhQUFhLEdBQTBDO0lBQzNELGVBQWU7SUFDZixVQUFVO0lBQ1YsYUFBYTtJQUNiLGVBQWU7SUFDZixjQUFjO0NBQ2YsQ0FBQztBQUVGOzs7O0dBSUc7QUFDSCxTQUFnQixTQUFTLENBQUMsSUFBVSxFQUFFLElBQW9CO0lBQ3hELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsSUFBSSx5QkFBeUIsQ0FBQyxDQUFDO0lBRXpELGdDQUFnQztJQUNoQyxLQUFLLE1BQU0sSUFBSSxJQUFJLGdCQUFnQixFQUFFLENBQUM7UUFDcEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZCLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3RCLDBGQUEwRjtZQUMxRixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUNqRCxDQUFDO0lBQ0gsQ0FBQztJQUVELDBFQUEwRTtJQUMxRSxLQUFLLE1BQU0sSUFBSSxJQUFJLGFBQWEsRUFBRSxDQUFDO1FBQ2pDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJ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