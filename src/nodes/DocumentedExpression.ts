import Expression from "./Expression";
import type Type from "./Type";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import type Node from "./Node";
import type Bind from "./Bind";
import type Context from "./Context";
import type TypeSet from "./TypeSet";
import type Transform from "../transforms/Transform";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import type Evaluator from "../runtime/Evaluator";
import Docs from "./Docs";

export default class DocumentedExpression extends Expression {

    readonly docs: Docs;
    readonly expression: Expression;

    constructor(docs: Docs, expression: Expression) {
        super();
     
        this.docs = docs;
        this.expression = expression;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "docs", types: [ Docs ] },
            { name: "expression", types: [ Expression ] },
        ]; 
    }

    computeConflicts() {}

    computeType(context: Context): Type {
        return this.expression.getType(context);
    }

    getDependencies(): Expression[] {
        return [ this.expression ];
    }

    compile(context: Context): Step[] {
        return this.expression.compile(context);
    }

    evaluate(_: Evaluator): Value | undefined { return undefined; }

    replace(original?: Node, replacement?: Node) { 
        return new DocumentedExpression(
            this.replaceChild("docs", this.docs, original, replacement),
            this.replaceChild("expression", this.expression, original, replacement)
        ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

    getChildReplacement(): Transform[] | undefined { return undefined; }
    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }
    getChildRemoval(): Transform | undefined { return undefined; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: `A documented expression.`
        }
    }

    getStart() { return this.expression; }
    getFinish() { return this.expression; }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to this expression's value."
        }
    }

}