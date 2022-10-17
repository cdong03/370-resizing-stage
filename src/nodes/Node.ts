import type Conflict from "../conflicts/Conflict";
import type Definition from "./Definition";
import type Context from "./Context";
import type Translations from "./Translations";
import type Reference from "./Reference";

/* A global ID for nodes, for helping index them */
let NODE_ID_COUNTER = 0;

export enum Position { ON, BEFORE, END };
export type Replacement = Node | [ Node, Node ] | Reference<Node>;

export default abstract class Node {

    /* A unique ID to represent this node in memory. */
    readonly id: number;

    /* A cache of the children of this node, in parse order. */
    _children: undefined | Node[] = undefined;

    /* A cache of this node's parent. Undefined means no cache, null means no parent. */
    _parent: undefined | null | Node = undefined;

    /** A cache of conflicts on this node. Undefined means no cache. */
    _conflicts: undefined | Conflict[] = undefined;

    constructor() {
        this.id = NODE_ID_COUNTER++;
    }

    /* A recursive function that computes parents. Called by the root. Assumes the tree is immutable. */
    cacheParents() {

        const children = this.getChildren();
        for(let i = 0; i < children.length; i++) {
            const child = children[i];
            child._parent = this;
            child.cacheParents();
        }

    }

    /** Returns the children in the node, in order. Needed for batch operations on trees. Cache children to avoid recomputation. */
    getChildren(): Node[] {
        if(this._children === undefined)
            this._children = this.computeChildren();
        return this._children;
    }

    /** Construct a list of nodes in the sequence they are parsed, used for traversal. */
    abstract computeChildren(): Node[];

    /** Given the program in which the node is situated, returns any conflicts on this node that would prevent execution. */
    abstract computeConflicts(context: Context): Conflict[] | void;

    /**
     * Get all bindings defined by this node.
     */
    getDefinitions(node: Node, context: Context): Definition[] { context; node; return []; }
    
    /** Get all bindings defined by this node and all binding enclosures. */
    getAllDefinitions(node: Node, context: Context): Definition[] {

        let definitions: Definition[] = [];
        let current: Node | undefined = this;
        while(current !== undefined) {
            definitions = [ ...current.getDefinitions(node, context), ...definitions ];
            current = current.getBindingEnclosureOf();
        }
        return definitions;

    }

    /** 
     * Each node has the option of exposing bindings. By default, nodes expose no bindings.
     **/
    getDefinitionOfName(name: string, context: Context, node: Node): Definition | undefined {
        
        let current: Node | undefined = this;
        while(current !== undefined) {
            const def = current.getDefinitions(node, context).find(def => def.hasName(name));
            if(def !== undefined) return def;
            current = current.getBindingEnclosureOf();
        }
        return undefined;
    };
    
    /**
     * Gathers all matching definitions in scope, useful for checking for duplicate bindings.
     */
    getAllDefinitionsOfName(name: string, context: Context, node: Node): Definition[] {

        const definitions = [];
        let current: Node | undefined = this;
        while(current !== undefined) {
            const definition = current.getDefinitionOfName(name, context, node);
            if(definition !== undefined)
                definitions.unshift(definition);
            current = current.getBindingEnclosureOf();
        }
        return definitions;

    }

    /** Compute and store the conflicts. */
    getConflicts(context: Context) { 
        if(this._conflicts === undefined)
            this._conflicts = this.computeConflicts(context) ?? [];
        return this._conflicts;
    }

    getConflictCache() { return this._conflicts === undefined ? [] : this._conflicts; }
    
    /** Returns all the conflicts in this tree. */
    getAllConflicts(context: Context): Conflict[] {
        let conflicts: Conflict[] = [];
        this.traverse(node => {
            const nodeConflicts = node.getConflicts(context);
            if(nodeConflicts !== undefined)
                conflicts = conflicts.concat(nodeConflicts);
            return true;
        });
        return conflicts;
    }

    /** Get the binding enclosure of this node by recursively asking ancestors if they are binding enclosures of the given node. */
    getBindingEnclosureOf(): Node | undefined {
        return this._parent instanceof Node ?
            (this._parent.isBindingEnclosureOfChild(this) ? this._parent : this._parent.getBindingEnclosureOf()) :
            undefined;
    }

    /** True if the given node is a child of this node and this node should act as a binding enclosure of it. */
    isBindingEnclosureOfChild(child: Node): boolean { child; return false; }

    toString(depth: number=0): string {
        const tabs = "\t".repeat(depth);
        return `${tabs}${this.constructor.name}\n${this.getChildren().map(n => n.toString(depth + 1)).join("\n")}`;
    }

    toWordplay(): string { return this.getChildren().map(t => t.toWordplay()).join(""); }

    /** A depth first traversal of this node and its descendants. Keeps traversing until the inspector returns false. */
    traverse(inspector: (node: Node) => boolean): boolean {
        const every = this.getChildren().every(c => c.traverse(inspector));
        if(every)
            inspector.call(undefined, this);
        return every;
    }

    /** Returns all this and all decedants in depth first order. Optionally uses the given function to decide whether to include a node. */
    nodes(include?: (node: Node) => boolean): Node[] {
        const nodes: Node[] = [];
        this.traverse(node => { 
            if(include === undefined || include.call(undefined, node) === true)
                nodes.push(node); 
            return true; 
        });
        return nodes;
    }

    /** Finds the descendant of this node (or this node) that has the given ID. */
    getNodeByID(id: number): Node | undefined {

        if(this.id === id) return this;
        const children = this.getChildren();
        for(let i = 0; i < children.length; i++) {
            const match = children[i].getNodeByID(id);
            if(match) return match;
        }
        return undefined;

    }

    /** Returns a list of ancestors, with the parent as the first item in the list and the root as the last. */
    getAncestors(): Node[] | undefined {

        const ancestors = [];
        let parent = this._parent;
        while(parent) {
            ancestors.push(parent);
            parent = parent._parent;
        }
        return ancestors;

    }

    /** Finds the nearest ancestor of the given type. */
    getNearestAncestor<T extends Node>(type: Function): T | undefined {
        return this.getAncestors()?.find(n => n instanceof type) as T ?? undefined;
    }

    /** Returns the cached parent of the given node. Assumes the root of this node has called cacheParents(). */
    getParent(): Node | null | undefined {
        return this._parent;
    }

    /** True if the given nodes appears in this tree. */
    contains(node: Node) {

        // Strategy: scan the given node's ancestors to see if this is one.
        let parent: undefined | null | Node = node;
        while(parent !== null && parent !== undefined) {
            if(parent === this) return true;
            parent = parent._parent;
        }
        return false;

    }

    whitespaceContainsPosition(index: number): boolean {
        const children = this.getChildren();
        return children.length > 0 && children[0].whitespaceContainsPosition(index);
    }

    /** Creates a deep clone of this node and it's descendants. If it encounters replacement along the way, it uses that instead of the existing node. */
    abstract clone(original?: Node, replacement?: Node): this;

    /** A utility method that encapsulates an optional replacement during recursive cloning. */
    cloneOrReplace(types: (Function | undefined)[], original: Node | undefined, replacement: Node | undefined): this {
        if(this === original && replacement !== undefined) {
            // See if the replacement is one of the expected types.
            let valid = false;
            for(const type of types) {
                if(type === undefined) {
                    if(replacement === undefined) { 
                        valid = true; 
                        break; 
                    }
                }
                else {
                    if(replacement instanceof type) {
                        valid = true;
                        break;
                    }
                }
            }
            if(valid) return replacement as this;
            else throw Error("Replacement isn't of a valid type.");
        }
        else
            return this.clone(original, replacement) as this;
    }

    abstract getDescriptions(): Translations;

    /** Get nodes that would be valid replacements for this node. Used in autocomplete. */
    getReplacements(context: Context, before: Position): Replacement[] { return this.getParent()?.getChildReplacements(this, context, before) ?? []; }

    /** Given a node that is possibly a child of this node, return a list of valid replacements of the child. */
    getChildReplacements(child: Node, context: Context, position: Position = Position.ON): Replacement[] { child; context; position; return []; }

}