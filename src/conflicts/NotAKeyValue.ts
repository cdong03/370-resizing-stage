import type Context from '../nodes/Context';
import type Expression from '../nodes/Expression';
import type MapLiteral from '../nodes/MapLiteral';
import NodeLink from '../translation/NodeLink';
import type Translation from '../translation/Translation';
import Conflict from './Conflict';

export class NotAKeyValue extends Conflict {
    readonly map: MapLiteral;
    readonly expression: Expression;

    constructor(map: MapLiteral, expression: Expression) {
        super(false);
        this.map = map;
        this.expression = expression;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.expression,
                explanation: (translation: Translation) =>
                    translation.conflict.NotAMap.primary,
            },
            secondary: {
                node: this.map.open,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.NotAMap.secondary(
                        new NodeLink(this.expression, translation, context)
                    ),
            },
        };
    }
}