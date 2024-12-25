import {
  AnyObject,
  ArraySchema,
  ObjectSchema,
  Schema,
  ValidateOptions,
} from 'yup';
import 'reflect-metadata';
import * as yup from 'yup';

import { MetadataStorage } from './metadata';

const metadataStorage = new MetadataStorage();

// named schema
const _schemas: { [key: string]: ObjectSchema<AnyObject> } = {};

// unnamed and named schema
const _allSchemas = new Map<Function, ObjectSchema<AnyObject>>();

/**
 * Get the schema by name
 *
 * @param {string} name Name of the schema
 * @returns {ObjectSchema<AnyObject>} The yup schema
 */
function getNamedSchema(name: string): ObjectSchema<AnyObject> {
  return _schemas[name]!;
}

/**
 * Get the schema by type
 *
 * @param {Object} target the object's type (class)
 * @returns {ObjectSchema<AnyObject>} The yup schema
 */
function getSchemaByType(target: Object): ObjectSchema<AnyObject> {
  const constructor = target instanceof Function ? target : target.constructor;
  return _allSchemas.get(constructor)!;
}

/**
 * Register a new named schema
 *
 * @param {string} name the schema name
 * @param {ObjectSchema<AnyObject>} objectSchema The initial schema
 */
function namedSchema(
  name: string,
  objectSchema: ObjectSchema<AnyObject> = yup.object<AnyObject>()
): ClassDecorator {
  return target => {
    objectSchema = _defineSchema(target, objectSchema);
    _schemas[name] = objectSchema;
  };
}

/**
 * Register a schema
 *
 * @param {ObjectSchema} objectSchema The initial schema
 * @return {ClassDecorator} The class decorator
 */
function schema(
  objectSchema: ObjectSchema<AnyObject> = yup.object<AnyObject>()
): ClassDecorator {
  return target => {
    _defineSchema(target, objectSchema);
  };
}

/**
 * Register a schema to the given property
 *
 * @param {Schema} schema the schema to register
 * @return {PropertyDecorator} The property decorator
 */
function is(schema: Schema<AnyObject>): PropertyDecorator {
  return (target, property) => {
    metadataStorage.addSchemaMetadata({
      target: target instanceof Function ? target : target.constructor,
      property,
      schema,
    });
  };
}

/**
 * Register an array property
 *
 * @param {() => Function} typeFunction a function that returns type of the element
 * @param {ArraySchema} arraySchema the array schema
 * @param {ObjectSchema} elementSchema an optional object schema
 */
function nestedArray(
  typeFunction: () => Function,
  arraySchema: ArraySchema<any, any> = yup.array(),
  elementSchema?: ObjectSchema<AnyObject>
): PropertyDecorator {
  return (target, property) => {
    const nestedType = typeFunction();
    const nestedElementSchema = _getObjectSchema(nestedType, elementSchema);

    metadataStorage.addSchemaMetadata({
      target: target instanceof Function ? target : target.constructor,
      property,
      schema: arraySchema.of(nestedElementSchema),
    });
  };
}

/**
 * Register an object schema to the given property. Use this when the property type is unknown
 *
 * @param {() => Function} typeFunction  a function that returns type of the element
 * @param {ObjectSchema} objectSchema an optional object schema
 */
function nestedType(
  typeFunction: () => Function,
  objectSchema?: ObjectSchema<AnyObject>
): PropertyDecorator {
  return (target, property) => {
    const nestedType = typeFunction();
    const nestedSchema = _getObjectSchema(nestedType, objectSchema);

    metadataStorage.addSchemaMetadata({
      target: target instanceof Function ? target : target.constructor,
      property,
      schema: nestedSchema,
    });
  };
}

/**
 * Register an object schema to the given property.
 * Use this when the property type is known and can be extracted using reflect-metadata
 *
 * @param objectSchema an optional object schema
 * @return {PropertyDecorator}
 */
function nested(objectSchema?: ObjectSchema<AnyObject>): PropertyDecorator {
  return (target, property) => {
    const nestedType = (Reflect as any).getMetadata(
      'design:type',
      target,
      property
    );

    const nestedSchema = _getObjectSchema(nestedType, objectSchema);

    metadataStorage.addSchemaMetadata({
      target: target instanceof Function ? target : target.constructor,
      property,
      schema: nestedSchema,
    });
  };
}

/**
 * Get the object schema
 *
 * @param {Object} type the object type
 * @param {ObjectSchema} predefinedObjectSchema object schema to use,
 * if undefined, it will pick the schema from the type
 *
 * @returns {ObjectSchema}
 */
function _getObjectSchema(
  type: Function,
  predefinedObjectSchema?: ObjectSchema<AnyObject>
): ObjectSchema<AnyObject> {
  if (predefinedObjectSchema) {
    return _defineSchema(type, predefinedObjectSchema.clone());
  }

  // if there is no explicit object schema specified,
  // try getting it from the type else build one for it automatically.
  return getSchemaByType(type) ?? _defineSchema(type, yup.object<AnyObject>());
}

type IValidateArguments = {
  object: object;
  options?: ValidateOptions;
  schemaName?: string | Function;
};

type IValidatePathArguments = {
  object: object;
  options?: ValidateOptions;
  schemaName?: string | Function;
  path: string;
};

/**
 * Validate an object asynchronously
 *
 * @param {IValidateArguments} args the validate arguments
 * @param {string | Function} args.schemaName the name of the schema to use
 * @param {object} args.object the object to validate
 * @param {ValidateOptions} args.options validate options
 */
export function validate({ schemaName, object, options }: IValidateArguments) {
  const objectSchema = _getSchema({ object, schemaName });
  return objectSchema.validate(object, options);
}

/**
 * Validate an object synchronously
 *
 * @param args the validate arguments
 * @param args.schemaName the name of the schema to use
 * @param args.object the object to validate
 * @param args.options validate options
 * @return {IValidateArguments}
 */
export function validateSync({
  schemaName,
  object,
  options,
}: IValidateArguments) {
  const objectSchema = _getSchema({ object, schemaName });
  return objectSchema.validateSync(object, options);
}

/**
 * Validate an object's property asynchronously
 *
 * @param args the validate arguments
 * @param args.schemaName the name of the schema to use
 * @param args.path the property path
 * @param args.object the object to validate
 * @param args.options validate options
 */
function validateAt({
  schemaName,
  path,
  object,
  options,
}: IValidatePathArguments) {
  const objectSchema = _getSchema({ object, schemaName });
  return objectSchema.validateAt(path, object, options);
}

/**
 * Validate an object's property synchronously
 *
 * @param args the validate arguments
 * @param args.schemaName the name of the schema to use
 * @param args.path the property path
 * @param args.object the object to validate
 * @param args.options validate options
 */
function validateSyncAt({
  schemaName,
  path,
  object,
  options,
}: IValidatePathArguments) {
  const objectSchema = _getSchema({ object, schemaName });
  return objectSchema.validateSyncAt(path, object, options);
}

/**
 * Check if an object is valid asynchronously
 *
 * @param args the validate arguments
 * @param args.schemaName the name of the schema to use
 * @param args.object the object to validate
 * @param args.options validate options
 * @returns whether the object is valid
 */
function isValid({ schemaName, object, options }: IValidateArguments) {
  const objectSchema = _getSchema({ object, schemaName });
  return objectSchema.isValid(object, options);
}

/**
 * Check if an object is valid synchronously
 * @param args the validate arguments
 * @param args.schemaName the name of the schema to use
 * @param args.object the object to validate
 * @param args.options validate options
 * @returns whether the object is valid
 */
function isValidSync({ schemaName, object, options }: IValidateArguments) {
  const objectSchema = _getSchema({ object, schemaName });
  return objectSchema.isValidSync(object, options);
}

/**
 * Coerce object's property according to the schema
 *
 * @param args the validate arguments
 * @param args.schemaName the name of the schema to use
 * @param args.object the object to validate
 * @param args.options validate options
 * @returns the object that has been transformed
 */
function cast({ schemaName, object, options }: IValidateArguments) {
  const objectSchema = _getSchema({ object, schemaName });
  return objectSchema.cast(object, options);
}

/**
 * Get the schema named or unnamed
 *
 * @param {object} args.object
 * @param {string | Function} args.schemaName
 * @returns {Schema}
 */
function _getSchema({
  object,
  schemaName,
}: {
  object: object;
  schemaName?: string | Function;
}): Schema<any> {
  if (object === null || typeof object !== 'object') {
    throw new Error('Cannot validate non object types');
  }

  if (typeof schemaName === 'string') {
    return getNamedSchema(schemaName);
  }

  return getSchemaByType(schemaName ?? object.constructor);
}

/**
 * Compose object schema from metadata properties schemas
 *
 * Update {@link _allSchemas} with the composed schema
 *
 * @param {Function} target
 * @param {ObjectSchema} objectSchema
 * @returns {ObjectSchema} the composed object schema
 */
function _defineSchema(
  target: Function,
  objectSchema: ObjectSchema<AnyObject>
): ObjectSchema<AnyObject> {
  const schemaMap = metadataStorage.findSchemaMetadata(target);

  if (!schemaMap) {
    return objectSchema;
  }

  const objectShape: Record<string, Schema<AnyObject>> = Array.from(
    schemaMap.entries()
  ).reduce((currentShape, [property, schema]) => {
    return { ...currentShape, [property]: schema };
  }, {});

  const schemaWithMetadata = objectSchema.shape(objectShape);
  _allSchemas.set(target, schemaWithMetadata);
  return schemaWithMetadata;
}

const a = yup;
const an = yup;

export {
  cast,
  isValidSync,
  getNamedSchema,
  getSchemaByType,
  namedSchema,
  nestedType,
  schema,
  a,
  an,
  isValid,
  validateSyncAt,
  validateAt,
  nested,
  nestedArray,
  is,
  IValidateArguments,
  IValidatePathArguments,
};
