import { Schema } from 'yup';
import {
  TargetClass,
  TargetPropertiesSchemas,
  PropertySchema,
  PropertyName,
} from './types';

export class MetadataStorage {
  private _metadataMap = new Map<TargetClass, TargetPropertiesSchemas>();
  private _metadataCache = new Map<TargetClass, TargetPropertiesSchemas>();

  public addSchemaMetadata({
    target,
    schema,
    property,
  }: {
    target: TargetClass;
    schema: PropertySchema;
    property: PropertyName;
  }): void {
    let schemaMap = this._metadataMap.get(target);

    if (!schemaMap) {
      schemaMap = new Map<string, Schema<any>>();
      this._metadataMap.set(target, schemaMap);
    }
    schemaMap.set(property, schema);
  }

  public findSchemaMetadata(target: Function) {
    // Check if the metadata is already cached
    const cachedValue = this._metadataCache.get(target);
    if (cachedValue) {
      return cachedValue;
    }

    // Retrieves all the schemas from the prototype chain of the target,
    // combines them, and builds a new schema.
    const inheritanceMaps: Array<TargetPropertiesSchemas> = [];
    let currentTarget = target;
    do {
      const schema = this._metadataMap.get(currentTarget);

      if (schema) {
        inheritanceMaps.unshift(schema);
      }
      const currentPrototype = Object.getPrototypeOf(currentTarget.prototype);
      currentTarget = currentPrototype && currentPrototype.constructor;
    } while (currentTarget);

    if (!inheritanceMaps.length) {
      return null;
    }

    const iterator: Array<[
      PropertyName,
      PropertySchema
    ]> = inheritanceMaps.flatMap(map => Array.from(map.entries()));

    const schemaMap = new Map<PropertyName, Schema<any>>(iterator);

    this._metadataCache.set(target, schemaMap);
    return schemaMap;
  }
}
