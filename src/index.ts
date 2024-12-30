import { ArraySchema, Schema, ValidateOptions } from 'yup';
import 'reflect-metadata';
import * as yup from 'yup';

import { MetadataStorage } from './metadata';

const metadataStorage = new MetadataStorage();

// named schema
const _schemas: { [key: string]: Schema<any> } = {};

// unnamed and named schema
const _allSchemas = new Map<Function, Schema<any>>();

/**
 * Get the schema by name
 *
 * @param {string} name Name of the schema
 *
 * @example
 * ```typescript
 * // register a named schema
 * \@namedSchema('user')
 * class User {
 *	...
 * }
 *
 * // you can get the yup schema with
 * const userSchema = getNamedSchema('user');
 * ```
 */
function getNamedSchema(name: string): Schema<any> {
  return _schemas[name]!;
}

/**
 * Get the schema by type
 *
 * @param {Object} target the object's type (class)
 *
 * @example
 * ```typescript
 * \@schema()
 * class User {
 *   ...
 * }
 *
 * // you can get the yup schema with
 * const userSchema = getSchemaByType(User);
 * ```
 */
function getSchemaByType(target: Object): Schema<any> {
  const constructor = target instanceof Function ? target : target.constructor;
  return _allSchemas.get(constructor)!;
}

type SchemaOptions = {
  /**
   * During validation, the object type is checked, and if it is not an instance of the target object, a new instance is created.
   * In this case, the constructor is called with the already validated properties.
   *
   * **Defining a constructor is required.**
   *
   * @default false
   *
   * @example
   * ```typescript
   *    \@schema({ useTargetClass: true })
   *    class User {
   *      constructor(args: { name: string; job: Job; birthday: Date }) {
   *        this.name = args.name;
   *        this.job = args.job;
   *        this.birthday = args.birthday;
   *      }
   *
   *      \@is(a.string().required())
   *      name: string;
   *
   *      \@is(a.date().required())
   *      birthday: Date;
   *
   *      \@nestedType(
   *        () => Job,
   *        s => s.required()
   *      )
   *      job: Job;
   *  }
   *
   * void main() {
   *   const user: User = await validate({
   *      object: {
   *        job: { name: 'Dev' },
   *        name: 'Mattia',
   *        birthday: new Date().toString(),
   *      },
   *      schemaName: User,
   *   });
   *
   *  console.log(
   *    user instanceof User,
   *    user.birthday instanceof Date,
   *    user.job instanceof Job
   *  ); // true, true, true
   * }
   * ```
   */
  useTargetClass?: boolean;
};

/**
 * Register a new named schema
 *
 * @param {string} name the schema name
 * @param {ObjectSchema<AnyObject>} objectSchema The initial schema
 *
 * @example
 *
 * ```typescript
 * // register a named schema
 * \@namedSchema('user')
 * class User {
 *	...
 * }
 *
 * // you can get the yup schema with
 * const userSchema = getNamedSchema('user');
 * ```
 */
function namedSchema(name: string, options?: SchemaOptions): ClassDecorator {
  return target => {
    _schemas[name] = _defineSchema(target, {
      useTargetClass: options?.useTargetClass,
    });
  };
}

/**
 * Register a schema
 *
 * @param {ObjectSchema} objectSchema The initial schema
 * @return {ClassDecorator} The class decorator
 *
 * @example
 * ```typescript
 * \@schema()
 * class User {
 *   ...
 * }
 *
 * // you can get the yup schema with
 * const userSchema = getSchemaByType(User);
 * ```
 */
function schema(options?: SchemaOptions): ClassDecorator {
  return target => {
    _defineSchema(target, {
      useTargetClass: options?.useTargetClass,
    });
  };
}

/**
 * Register a schema to the given property
 *
 * @param {Schema} schema the schema to register
 * @return {PropertyDecorator} The property decorator
 *
 * @example
 * ```typescript
 *    \@is(a.string().uppercase())
 *    uppercase: string;
 *
 *    \@is(
 *       an
 *          .array()
 *          .of(a.number())
 *          .min(2)
 *          .max(3)
 *   )
 *   array: number[];
 * ```
 */
function is(schema: Schema<any>): PropertyDecorator {
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
 *
 * @example
 * ```typescript
 *    \@nestedArray(() => Office, an.array().min(1, 'Office is required'))
 *    office: Office[];
 * ```
 */
function nestedArray(
  typeFunction: () => Function,
  arraySchema: ArraySchema<any, any> = yup.array(),
  elementSchema?: (schema: Schema) => Schema
): PropertyDecorator {
  return (target, property) => {
    const nestedType = typeFunction();
    const nestedElementSchema = _getObjectSchema(nestedType, {
      compose: elementSchema,
    });

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
 *
 * @example
 * ```typescript
 *    \@nestedType(() => Office)
 *    office: Office;
 * ```
 */
function nestedType(
  typeFunction: () => Function,
  elementSchema?: (schema: Schema) => Schema
): PropertyDecorator {
  return (target, property) => {
    const nestedType = typeFunction();
    const nestedSchema = _getObjectSchema(nestedType, {
      compose: elementSchema,
    });

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
 *
 * @example
 * ```typescript
 *    \@nested(an.object().required('Job is required'))
 *    job: Job;
 * ```
 */
function nested(schema?: (schema: Schema) => Schema): PropertyDecorator {
  return (target, property) => {
    const nestedType = (Reflect as any).getMetadata(
      'design:type',
      target,
      property
    );

    const nestedSchema = _getObjectSchema(nestedType, { compose: schema });

    metadataStorage.addSchemaMetadata({
      target: target instanceof Function ? target : target.constructor,
      property,
      schema: nestedSchema,
    });
  };
}

type IValidateArguments = {
  object: Object;
  options?: ValidateOptions;
  schemaName?: string | Function;
};

type IValidatePathArguments = {
  object: Object;
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
function validate({ schemaName, object, options }: IValidateArguments) {
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
function validateSync({ schemaName, object, options }: IValidateArguments) {
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
function isValid({
  schemaName,
  object,
  options,
}: IValidateArguments): Promise<boolean> {
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
function isValidSync({
  schemaName,
  object,
  options,
}: IValidateArguments): boolean {
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

type _GetSchemaOptions = {
  compose?: (schema: Schema) => Schema;
};

/**
 * Get the object schema
 *
 * @param {Object} type the object type
 * if undefined, it will pick the schema from the type
 *
 * @returns {ObjectSchema}
 */
function _getObjectSchema(
  type: Function,
  options: _GetSchemaOptions
): Schema<any> {
  const { compose } = options;
  const schemaByType = getSchemaByType(type);

  if (schemaByType) {
    return compose?.(schemaByType) ?? schemaByType;
  }

  return _defineSchema(type, options);
}

type _DefineSchemaOptions = {
  compose?: (schema: Schema) => Schema;
  useTargetClass?: boolean;
};

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
  options: _DefineSchemaOptions
): Schema<any> {
  const { compose, useTargetClass } = options;

  const schemaMap = metadataStorage.findSchemaMetadata(target);
  const objectShape: Record<string, Schema<any>> = Array.from(
    schemaMap?.entries() ?? []
  ).reduce((currentShape, [property, schema]) => {
    return { ...currentShape, [property]: schema };
  }, {});

  let targetSchema: Schema;

  if (useTargetClass) {
    targetSchema = yup
      .mixed((input): input is typeof target => input instanceof target)
      .transform((value, _, ctx) => {
        const validData = a
          .object(objectShape)
          .validateSync(value, { abortEarly: false, strict: false });

        if (ctx.isType(validData)) {
          return validData;
        }

        return new (target as any)(validData);
      });
  } else {
    targetSchema = yup.object(objectShape);
  }

  const composed = compose?.(targetSchema) ?? targetSchema;

  _allSchemas.set(target, composed);
  return composed;
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
  validate,
  validateSync,
  validateSyncAt,
  validateAt,
  nested,
  nestedArray,
  is,
  IValidateArguments,
  IValidatePathArguments,
};
