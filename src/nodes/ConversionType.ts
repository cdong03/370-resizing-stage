import { CONVERSION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { CONVERT_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Transform from "../transforms/Transform";
import Type from "./Type";
import Unparsable from "./Unparsable";
import TypePlaceholder from "./TypePlaceholder";
import Replace from "../transforms/Replace";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class ConversionType extends Type {

    readonly input: Type;
    readonly convert: Token;
    readonly output: Type | Unparsable;
    
    constructor(input: Type, convert: Token | undefined, output: Type | Unparsable) {
        super();
        
        this.input = input;
        this.convert = convert ?? new Token(CONVERT_SYMBOL, TokenType.CONVERT);
        this.output = output;

        this.computeChildren();

    }
    getGrammar() { 
        return [
            { name: "input", types:[ Type ] },
            { name: "convert", types:[ Token ] },
            { name: "output", types:[ Type, Unparsable ] },
        ]; 
    }

    computeConflicts() {}

    accepts(type: Type, context: Context): boolean {
        return type instanceof ConversionType && this.input.accepts(type.input, context) && this.output instanceof Type && type.output instanceof Type && this.output.accepts(type.output, context);
    }

    getNativeTypeName(): string { return CONVERSION_NATIVE_TYPE_NAME; }

    clone(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new ConversionType(
            this.cloneOrReplaceChild(pretty, "input", this.input, original, replacement), 
            this.cloneOrReplaceChild(pretty, "convert", this.convert, original, replacement),
            this.cloneOrReplaceChild(pretty, "output", this.output, original, replacement)
        ).label(this._label) as this; 
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A conversion function type"
        }
    }

    getChildReplacement(): Transform[] | undefined { return undefined; }
    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return undefined; }
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.input || child === this.output) return new Replace(context.source, child, new TypePlaceholder());
    }

}