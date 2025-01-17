import type MagicString from 'magic-string';
import { BLANK } from '../../utils/blank';
import type { NodeRenderOptions, RenderOptions } from '../../utils/renderHelpers';
import type { DeoptimizableEntity } from '../DeoptimizableEntity';
import type { HasEffectsContext } from '../ExecutionContext';
import type {
	NodeInteraction,
	NodeInteractionCalled,
	NodeInteractionWithThisArgument
} from '../NodeInteractions';
import {
	EMPTY_PATH,
	type ObjectPath,
	type PathTracker,
	SHARED_RECURSION_TRACKER,
	UnknownKey
} from '../utils/PathTracker';
import Identifier from './Identifier';
import Literal from './Literal';
import * as NodeType from './NodeType';
import type Property from './Property';
import SpreadElement from './SpreadElement';
import { type ExpressionEntity, type LiteralValueOrUnknown } from './shared/Expression';
import { NodeBase } from './shared/Node';
import { ObjectEntity, type ObjectProperty } from './shared/ObjectEntity';
import { OBJECT_PROTOTYPE } from './shared/ObjectPrototype';

export default class ObjectExpression extends NodeBase implements DeoptimizableEntity {
	declare properties: readonly (Property | SpreadElement)[];
	declare type: NodeType.tObjectExpression;
	private objectEntity: ObjectEntity | null = null;

	deoptimizeCache(): void {
		this.getObjectEntity().deoptimizeAllProperties();
	}

	deoptimizePath(path: ObjectPath): void {
		this.getObjectEntity().deoptimizePath(path);
	}

	deoptimizeThisOnInteractionAtPath(
		interaction: NodeInteractionWithThisArgument,
		path: ObjectPath,
		recursionTracker: PathTracker
	): void {
		this.getObjectEntity().deoptimizeThisOnInteractionAtPath(interaction, path, recursionTracker);
	}

	getLiteralValueAtPath(
		path: ObjectPath,
		recursionTracker: PathTracker,
		origin: DeoptimizableEntity
	): LiteralValueOrUnknown {
		return this.getObjectEntity().getLiteralValueAtPath(path, recursionTracker, origin);
	}

	getReturnExpressionWhenCalledAtPath(
		path: ObjectPath,
		interaction: NodeInteractionCalled,
		recursionTracker: PathTracker,
		origin: DeoptimizableEntity
	): ExpressionEntity {
		return this.getObjectEntity().getReturnExpressionWhenCalledAtPath(
			path,
			interaction,
			recursionTracker,
			origin
		);
	}

	hasEffectsOnInteractionAtPath(
		path: ObjectPath,
		interaction: NodeInteraction,
		context: HasEffectsContext
	): boolean {
		return this.getObjectEntity().hasEffectsOnInteractionAtPath(path, interaction, context);
	}

	render(
		code: MagicString,
		options: RenderOptions,
		{ renderedSurroundingElement }: NodeRenderOptions = BLANK
	): void {
		super.render(code, options);
		if (
			renderedSurroundingElement === NodeType.ExpressionStatement ||
			renderedSurroundingElement === NodeType.ArrowFunctionExpression
		) {
			code.appendRight(this.start, '(');
			code.prependLeft(this.end, ')');
		}
	}

	protected applyDeoptimizations() {}

	private getObjectEntity(): ObjectEntity {
		if (this.objectEntity !== null) {
			return this.objectEntity;
		}
		let prototype: ExpressionEntity | null = OBJECT_PROTOTYPE;
		const properties: ObjectProperty[] = [];
		for (const property of this.properties) {
			if (property instanceof SpreadElement) {
				properties.push({ key: UnknownKey, kind: 'init', property });
				continue;
			}
			let key: string;
			if (property.computed) {
				const keyValue = property.key.getLiteralValueAtPath(
					EMPTY_PATH,
					SHARED_RECURSION_TRACKER,
					this
				);
				if (typeof keyValue === 'symbol') {
					properties.push({ key: UnknownKey, kind: property.kind, property });
					continue;
				} else {
					key = String(keyValue);
				}
			} else {
				key =
					property.key instanceof Identifier
						? property.key.name
						: String((property.key as Literal).value);
				if (key === '__proto__' && property.kind === 'init') {
					prototype =
						property.value instanceof Literal && property.value.value === null
							? null
							: property.value;
					continue;
				}
			}
			properties.push({ key, kind: property.kind, property });
		}
		return (this.objectEntity = new ObjectEntity(properties, prototype));
	}
}
