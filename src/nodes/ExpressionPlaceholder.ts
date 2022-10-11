import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Placeholder from "../conflicts/Placeholder";
import Halt from "../runtime/Halt";
import type Bind from "./Bind";
import type Context from "./Context";
import type { TypeSet } from "./UnionType";
import SemanticException from "../runtime/SemanticException";
import type Evaluator from "../runtime/Evaluator";
import UnimplementedException from "../runtime/UnimplementedException";
import { PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import AccessName from "./AccessName";
import BooleanLiteral from "./BooleanLiteral";

export default class ExpressionPlaceholder extends Expression {
    
    readonly etc: Token;

    constructor(etc?: Token) {
        super();
        this.etc = etc ?? new Token(PLACEHOLDER_SYMBOL, [ TokenType.ETC ]);
    }

    computeChildren() { return [ this.etc ]; }

    computeConflicts(): Conflict[] { 
        return [ new Placeholder(this) ];
    }

    computeType(): Type { return new UnknownType(this); }

    compile(): Step[] {
        return [ new Halt(evaluator => new UnimplementedException(evaluator), this) ];
    }

    getStartExplanations() { 
        return {
            "eng": "Can't evaluate a placeholder."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Can't evaluate a placeholder."
        }
    }

    evaluate(evaluator: Evaluator): Value {
        return new SemanticException(evaluator, this);
    }

    clone(original?: Node, replacement?: Node) { 
        return new ExpressionPlaceholder(this.etc.cloneOrReplace([ Token ], original, replacement)) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

    getReplacementOptions() {

        return [
            {
                node: new AccessName(new ExpressionPlaceholder(), undefined, new Token("name", [ TokenType.NAME])),
                label: { "eng": "Get a named value from a structure." }
            },
            {
                node: new BooleanLiteral(true),
                label: { "eng": "True" }
            },
            {
                node: new BooleanLiteral(false),
                label: { "eng": "False" }
            },
            // {
            //     code: "… → …",
            //     action: () => {}
            // },
            // {
            //     code: "… → …",
            //     action: () => {}
            // },
            // {
            //     code: "ƒ …() …",
            //     action: () => {}
            // },
            // {
            //     code: "…•…",
            //     action: () => {}
            // },
            // {
            //     code: "…[…]",
            //     action: () => {}
            // },
            // {
            //     code: "…{…}",
            //     action: () => {}
            // },
            // {
            //     code: "… ∆ … …",
            //     action: () => {}
            // },
            // {
            //     code: "[]",
            //     action: () => {}
            // },
            // {
            //     code: "{}",
            //     action: () => {}
            // },
            // {
            //     code: "\\…\\",
            //     action: () => {}
            // }
        ];

    }

}