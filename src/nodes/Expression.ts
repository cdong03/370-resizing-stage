import Node from "./Node";
import type Context from "./Context";
import type Evaluator from "../runtime/Evaluator";
import type Value from "src/runtime/Value";
import type Type from "./Type";
import type Step from "src/runtime/Step";
import UnknownType from "./UnknownType";
import type Bind from "./Bind";
import type TypeSet from "./TypeSet";
import type Translations from "./Translations";
import type Stream from "../runtime/Stream";

export default abstract class Expression extends Node {

    /** A cache of the type computed for this epxression. Undefined means its not computed. */
    _type: Type | undefined = undefined;
    
    constructor() {
        super();
    }

    /** 
     * True if the expression is involved in triggering an evaluation. Used to decide whether to present
     * as code or value during stepping.
     */
    isEvaluationInvolved() { return false; }
    isEvaluationRoot() { return false; }

    abstract computeType(context: Context): Type;

    getType(context: Context) {
        if(this._type === undefined)
            this._type = this.computeType(context);
        return this._type;
    }

    getTypeUnlessCycle(context: Context): Type {

        // If we've already visited this node while trying to determine its type, then there is a cycle.
        if(context.visited(this)) return new UnknownType({ cycle: this });

        context.visit(this);
        const type = this.getType(context);
        context.unvisit();
        return type;

    }

    abstract getDependencies(_: Context): (Expression | Stream<Value>)[];

    /** 
     * Used to determine what types are possible for a given after evalutaing this expression/ 
     * Most expressions do not manipulate possible types at all; primarily is just logical operators and type checks.
     * */
    abstract evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context): TypeSet;

    abstract compile(context: Context): Step[];
    abstract evaluate(evaluator: Evaluator, prior: Value | undefined): Value | undefined;

    abstract getStart(): Node;
    abstract getFinish(): Node;

    abstract getStartExplanations(evaluator: Evaluator): Translations;
    abstract getFinishExplanations(evaluator: Evaluator): Translations;

}