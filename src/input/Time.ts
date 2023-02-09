import type Evaluator from '@runtime/Evaluator';
import TemporalStream from '../runtime/TemporalStream';
import type Expression from '../nodes/Expression';
import NativeExpression from '../native/NativeExpression';
import Bind from '../nodes/Bind';
import MeasurementType from '../nodes/MeasurementType';
import NoneLiteral from '../nodes/NoneLiteral';
import NoneType from '../nodes/NoneType';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import Measurement from '../runtime/Measurement';
import type Value from '../runtime/Value';
import { getDocTranslations } from '../translation/getDocTranslations';
import { getNameTranslations } from '../translation/getNameTranslations';

const DEFAULT_FREQUENCY = 33;

export default class Time extends TemporalStream<Measurement> {
    firstTime: number | undefined = undefined;
    frequency: number = 33;
    lastTime: DOMHighResTimeStamp | undefined = undefined;

    constructor(evaluator: Evaluator, frequency: number = DEFAULT_FREQUENCY) {
        super(
            evaluator,
            TimeDefinition,
            new Measurement(evaluator.getMain(), 0, Unit.unit(['ms']))
        );
        this.frequency = frequency;
    }

    // No setup or cleanup necessary; Evaluator manages the requestAnimationFrame loop.
    start() {}
    stop() {}

    setFrequency(frequency: number | undefined) {
        this.frequency = frequency ?? DEFAULT_FREQUENCY;
    }

    tick(time: DOMHighResTimeStamp) {
        if (this.firstTime === undefined) this.firstTime = time;

        // If the frequency has elapsed, add a value to the stream.
        if (
            this.lastTime === undefined ||
            time - this.lastTime >= this.frequency
        ) {
            this.lastTime = time;
            this.add(
                Time.make(
                    this.creator,
                    this.firstTime === undefined
                        ? 0
                        : Math.round(time - this.firstTime)
                )
            );
        }
    }

    static make(creator: Expression, time: number) {
        return new Measurement(creator, time, Unit.unit(['ms']));
    }

    getType() {
        return StreamType.make(MeasurementType.make(Unit.unit(['ms'])));
    }
}

const type = MeasurementType.make(Unit.unit(['ms']));

const frequencyBind = Bind.make(
    getDocTranslations((t) => t.input.time.frequency.doc),
    getNameTranslations((t) => t.input.time.frequency.name),
    UnionType.make(MeasurementType.make(Unit.unit(['ms'])), NoneType.make()),
    // Default to nothing
    NoneLiteral.make()
);

export const TimeDefinition = StreamDefinition.make(
    getDocTranslations((t) => t.input.time.doc),
    getNameTranslations((t) => t.input.time.name),
    [frequencyBind],
    new NativeExpression(StreamType.make(type.clone()), (_, evaluation) => {
        const evaluator = evaluation.getEvaluator();

        // Get the given frequency.
        const frequencyValue: Value | undefined = evaluation.resolve(
            frequencyBind.names
        );

        // Convert to a number
        const frequency =
            frequencyValue instanceof Measurement
                ? frequencyValue.toNumber()
                : undefined;

        // Get the time stream corresponding to this node, creating one if necessary with the given inputs, or updating it, get it latest value.
        const stream = evaluator.getNativeStreamFor(evaluation.getCreator());

        // Update the configuration of the stream with the new frequency.
        if (stream instanceof Time) {
            stream.setFrequency(frequency);
            return stream;
        } else {
            const newStream = new Time(evaluator, frequency);
            evaluator.addNativeStreamFor(evaluation.getCreator(), newStream);
            return newStream;
        }
    }),
    type.clone()
);
