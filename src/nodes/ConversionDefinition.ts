import type Node from "./Node";
import Expression from "./Expression";
import Token from "./Token";
import TokenType from "./TokenType";
import Documentation from "./Documentation";
import type Conflict from "../conflicts/Conflict";
import { MisplacedConversion } from "../conflicts/MisplacedConversion";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import { getDuplicateDocs } from "./util";
import Block from "./Block";
import ConversionType from "./ConversionType";
import Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Conversion from "../runtime/Conversion";
import type Context from "./Context";
import { parseType, tokens } from "../parser/Parser";
import { CONVERT_SYMBOL } from "../parser/Tokenizer";
import type Bind from "./Bind";
import type { TypeSet } from "./UnionType";
import ContextException, { StackSize } from "../runtime/ContextException";
import { getPossibleTypes } from "./getPossibleTypes";
import getPossibleExpressions from "./getPossibleExpressions";
import type { Replacement } from "./Node";

export default class ConversionDefinition extends Expression {

    readonly docs: Documentation[];
    readonly convert: Token;
    readonly input: Type | Unparsable;
    readonly output: Type | Unparsable;
    readonly expression: Expression | Unparsable;

    constructor(docs: Documentation[], input: Type | Unparsable | string, output: Type | Unparsable | string, expression: Expression | Unparsable, convert?: Token) {
        super();

        this.docs = docs;
        this.convert = convert ?? new Token(CONVERT_SYMBOL, [ TokenType.CONVERT ]);
        this.input = typeof input === "string" ? parseType(tokens(input)) : input;
        this.output = typeof output === "string" ? parseType(tokens(output)) : output;
        this.expression = expression;
    }

    computeChildren() {
        let children: Node[] = [];
        children = children.concat(this.docs);
        children.push(this.input);
        if(this.convert) children.push(this.convert);
        children.push(this.output);
        children.push(this.expression);
        return children;
    }

    convertsTypeTo(input: Type, output: Type, context: Context) {
        return  !(this.input instanceof Unparsable) && this.input.accepts(input, context) &&
                !(this.output instanceof Unparsable) && this.output.accepts(output, context);
    }

    convertsType(input: Type, context: Context) {
        return !(this.input instanceof Unparsable) && this.input.accepts(input, context);
    }

    computeConflicts(): Conflict[] { 
        
        const conflicts: Conflict[] = [];
    
        // Docs must be unique.
        const duplicateDocs = getDuplicateDocs(this.docs);
        if(duplicateDocs) conflicts.push(duplicateDocs);

        // Can only appear in a block.
        const enclosure = this.getBindingEnclosureOf();
        if(!(enclosure instanceof Block))
            conflicts.push(new MisplacedConversion(this));
    
        return conflicts; 
    
    }

    computeType(): Type {
        return this.input instanceof Unparsable ? new UnknownType(this) : new ConversionType(this.input, undefined, this.output);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    getStartExplanations() { return this.getFinishExplanations(); }

    getFinishExplanations() {
        return {
            "eng": "Let's define this conversion!"
        }
    }

    evaluate(evaluator: Evaluator) {

        const context = evaluator.getEvaluationContext();
        if(context === undefined) return new ContextException(evaluator, StackSize.EMPTY);

        context.addConversion(new Conversion(this, context));
        
    }

    clone(original?: Node, replacement?: Node) { 
        return new ConversionDefinition(
            this.docs.map(d => d.cloneOrReplace([ Documentation ], original, replacement)), 
            this.input.cloneOrReplace([ Type, Unparsable ], original, replacement), 
            this.output.cloneOrReplace([ Type, Unparsable ], original, replacement), 
            this.expression.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.convert.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.expression instanceof Expression)
            this.expression.evaluateTypeSet(bind, original, current, context);
        return current;
    }
 
    getDescriptions() {
        return {
            eng: "A value conversion function"
        }
    }

    getChildReplacements(child: Node, context: Context): Replacement[] {
        
        // Input and output can be any type
        if(child === this.input || child === this.output)
            return getPossibleTypes(this, context);
        // Expression can be anything
        if(child === this.expression)
            return getPossibleExpressions(this, this.expression, context);

        return [];

    }

}