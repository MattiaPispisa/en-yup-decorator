import {
  ArraySchema,
  AnySchema,
  ValidateOptions,
  Lazy,
  array as yupArray,
  lazy as yupLazy,
  object as yupObject,
} from "yup";
import * as yup from "yup";

import { MetadataStorage } from "./metadata";
import { createEnYupSchema, IEnYupSchema } from "./en_yup_schema";

const metadataStorage = new MetadataStorage();

/**
 * Pending field metadata collected by field decorators.
 * Flushed to metadataStorage when the class decorator runs.
 *
 * TC39 field decorators do not receive the class, so we use this bridge.
 */
const _pendingFieldMetadata: Array<{
  property: string | symbol;
  schema: AnySchema | Lazy<any, any, any>;
}> = [];

function _flushPendingFieldMetadata(target: Function): void {
  for (const { property, schema } of _pendingFieldMetadata) {
    metadataStorage.addSchemaMetadata({ target, property, schema });
  }
  _pendingFieldMetadata.length = 0;
}

// named schema
const _schemas: { [key: string]: IEnYupSchema } = {};

// unnamed and named schema
const _allSchemas = new Map<Function, IEnYupSchema>();

/**
 * Get the schema by name
 *
 * @param {string} name Name of the schema
 * @returns {IEnYupSchema} the schema
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
function getNamedSchema(name: string): IEnYupSchema {
  return _schemas[name]!;
}

/**
 * Get the schema by type
 *
 * @param {object} target the object's type (class)
 * @returns {IEnYupSchema} the schema
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
function getSchemaByType(target: object): IEnYupSchema {
  const constructor = target instanceof Function ? target : target?.constructor;
  if (!constructor) {
    throw new Error("Cannot get schema: target or target.constructor is undefined");
  }
  return _allSchemas.get(constructor)!;
}

type SchemaOptions = {
  /**
   * Callback to compose or update the schema after it is built from field decorators.
   *
   * @example
   * ```typescript
   * @schema({
   *   compose: (o) => o.strict().noUnknown(true),
   * })
   * class User {
   *   @is(a.string().required())
   *   name: string;
   * }
   * ```
   */
  compose?: (schema: IEnYupSchema) => IEnYupSchema;

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
 * @param {SchemaOptions} options schema options
 * @returns {(target: Class, context?: ClassDecoratorContext<Class>) => void} TC39 class decorator function
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
function namedSchema(
  name: string,
  options?: SchemaOptions,
): <Class extends abstract new (...args: any) => any>(
  target: Class,
  context?: ClassDecoratorContext<Class>,
) => void {
  return <Class extends abstract new (...args: any) => any>(
    target: Class,
    _context?: ClassDecoratorContext<Class>,
  ): void => {
    _flushPendingFieldMetadata(target);
    _schemas[name] = _defineSchema(target, {
      compose: options?.compose,
      useTargetClass: options?.useTargetClass,
    });
  };
}

/**
 * Register a schema
 *
 * @param {SchemaOptions} options schema options
 * @returns {(target: Class, context?: ClassDecoratorContext<Class>) => void} TC39 class decorator function
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
function schema(
  options?: SchemaOptions,
): <Class extends abstract new (...args: any) => any>(
  target: Class,
  context?: ClassDecoratorContext<Class>,
) => void {
  return <Class extends abstract new (...args: any) => any>(
    target: Class,
    _context?: ClassDecoratorContext<Class>,
  ): void => {
    _flushPendingFieldMetadata(target);
    _defineSchema(target, {
      compose: options?.compose,
      useTargetClass: options?.useTargetClass,
    });
  };
}

/**
 * Register a schema to the given property
 *
 * @param {AnySchema | Lazy} schema the yup schema to register
 * @returns {(_value: undefined, context: ClassFieldDecoratorContext) => void} TC39 class field decorator function
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
function is(
  schema: AnySchema | Lazy<any, any, any>,
): (_value: undefined, context: ClassFieldDecoratorContext) => void {
  return <This, Value>(
    _value: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ): void => {
    _pendingFieldMetadata.push({ property: context.name, schema });
  };
}

/**
 * Register an array property
 *
 * @param {() => Function} typeFunction a function that returns type of the element
 * @param {ArraySchema} arraySchema the array schema
 * @param {(schema: IEnYupSchema) => IEnYupSchema} elementSchema callback to compose the element schema
 * @returns {(_value: undefined, context: ClassFieldDecoratorContext) => void} TC39 class field decorator function
 *
 * @example
 * ```typescript
 *    \@nestedArray(() => Office, an.array().min(1, 'Office is required'))
 *    office: Office[];
 * ```
 */
function nestedArray(
  typeFunction: () => Function,
  arraySchema: ArraySchema<any, any> = yupArray(),
  elementSchema?: (schema: IEnYupSchema) => IEnYupSchema,
): (_value: undefined, context: ClassFieldDecoratorContext) => void {
  return <This, Value>(
    _value: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ): void => {
    const nestedType = typeFunction();
    const nestedElementSchema = _getObjectSchema(nestedType, {
      compose: elementSchema,
    });

    _pendingFieldMetadata.push({
      property: context.name,
      schema: arraySchema.of(nestedElementSchema),
    });
  };
}

/**
 * Register an object for the given property where each value has the same type: `typeFunction`.
 *
 * @param {() => Function} typeFunction a function that returns type of the element
 * @param {(schema: AnySchema) => AnySchema} objectSchema callback to compose the record schema
 * @param {(schema: IEnYupSchema) => IEnYupSchema} elementSchema callback to compose the element schema
 * @returns {(_value: undefined, context: ClassFieldDecoratorContext) => void} TC39 class field decorator function
 *
 * @example
 * ```typescript
 *    \@nestedObject(() => Person, (s) => s.required('Contacts are required'))
 *    contacts: Record<string, Person>;
 * ```
 */
function nestedObject(
  typeFunction: () => Function,
  objectSchema?: (schema: AnySchema) => AnySchema,
  elementSchema?: (schema: IEnYupSchema) => IEnYupSchema,
): (_value: undefined, context: ClassFieldDecoratorContext) => void {
  return <This, Value>(
    _value: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ): void => {
    const nestedType = typeFunction();
    const nestedElementSchema = _getObjectSchema(nestedType, {
      compose: elementSchema,
    });
    const recordSchema = _recordSchema(nestedElementSchema, objectSchema);

    _pendingFieldMetadata.push({
      property: context.name,
      schema: recordSchema,
    });
  };
}

/**
 * Register an object schema to the given property. Use this when the property type is unknown.
 *
 * @param {() => Function} typeFunction a function that returns type of the element
 * @param {(schema: IEnYupSchema) => IEnYupSchema} elementSchema callback to compose the element schema
 * @returns {(_value: undefined, context: ClassFieldDecoratorContext) => void} TC39 class field decorator function
 *
 * @example
 * ```typescript
 *    \@nestedType(() => Office)
 *    office: Office;
 * ```
 */
function nestedType(
  typeFunction: () => Function,
  elementSchema?: (schema: IEnYupSchema) => IEnYupSchema,
): (_value: undefined, context: ClassFieldDecoratorContext) => void {
  return <This, Value>(
    _value: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ): void => {
    const nestedType = typeFunction();
    const nestedSchema = _getObjectSchema(nestedType, {
      compose: elementSchema,
    });

    _pendingFieldMetadata.push({
      property: context.name,
      schema: nestedSchema,
    });
  };
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
 * @returns {Promise<any>} object after validation
 *
 * @example
 * ```typescript
 * import { validate } from 'yup-decorator';
 *
 * const user = new User({ email: 'test', age: 27 });
 *
 *  validate({
 *    object: user,
 *    options: {
 *      strict: true,
 *      abortEarly: false,
 *    },
 *  }).then(err => {
 *    // err.name; // => 'ValidationError'
 *    // err.errors; // => ['Not a valid email']
 *  });
 *
 *  // you can also pass in the schema name as a string or a constructor
 *  validate({ object: user, schemaName: 'user' });
 *  validate({ object: user, schemaName: User });
 * ```
 */
function validate({ schemaName, object, options }: IValidateArguments): Promise<any> {
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
 * @return {any} object after validation
 *
 * @example
 * ```typescript
 * import { validate } from 'yup-decorator';
 *
 * const user = new User({ email: 'test', age: 27 });
 *
 *  validate({
 *    object: user,
 *    options: {
 *      strict: true,
 *      abortEarly: false,
 *    },
 *  }).then(err => {
 *    // err.name; // => 'ValidationError'
 *    // err.errors; // => ['Not a valid email']
 *  });
 *
 *  // you can also pass in the schema name as a string or a constructor
 *  validateSync({ object: user, schemaName: 'user' });
 *  validateSync({ object: user, schemaName: User });
 * ```
 */
function validateSync({ schemaName, object, options }: IValidateArguments): any {
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
 *
 * @example
 *
 * ```typescript
 * import { validate } from 'yup-decorator';
 *
 * const user = new User({ email: 'test', age: 27 });
 *
 *  validate({
 *    object: user,
 *    options: {
 *      strict: true,
 *      abortEarly: false,
 *    },
 *  }).then(err => {
 *    // err.name; // => 'ValidationError'
 *    // err.errors; // => ['Not a valid email']
 *  });
 *
 *  // you can also pass in the schema name as a string or a constructor
 *  validateAt({ object: user, schemaName: 'user', path: 'email' });
 *  validateAt({ object: user, schemaName: User, path: 'email' });
 * ```
 */
function validateAt({ schemaName, path, object, options }: IValidatePathArguments) {
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
 *
 * @example
 *
 * ```typescript
 * import { validate } from 'yup-decorator';
 *
 * const user = new User({ email: 'test', age: 27 });
 *
 *  validate({
 *    object: user,
 *    options: {
 *      strict: true,
 *      abortEarly: false,
 *    },
 *  }).then(err => {
 *    // err.name; // => 'ValidationError'
 *    // err.errors; // => ['Not a valid email']
 *  });
 *
 *  // you can also pass in the schema name as a string or a constructor
 *  validateSyncAt({ object: user, schemaName: 'user', path: 'email' });
 *  validateSyncAt({ object: user, schemaName: User, path: 'email' });
 * ```
 */
function validateSyncAt({ schemaName, path, object, options }: IValidatePathArguments) {
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
 *
 * @example
 *
 * ```typescript
 * import { validate } from 'yup-decorator';
 *
 * const user = new User({ email: 'test', age: 27 });
 *
 *  validate({
 *    object: user,
 *    options: {
 *      strict: true,
 *      abortEarly: false,
 *    },
 *  }).then(err => {
 *    // err.name; // => 'ValidationError'
 *    // err.errors; // => ['Not a valid email']
 *  });
 *
 *  // you can also pass in the schema name as a string or a constructor
 *  isValid({ object: user, schemaName: 'user' });
 *  isValid({ object: user, schemaName: User });
 * ```
 */
function isValid({ schemaName, object, options }: IValidateArguments): Promise<boolean> {
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
 *
 * @example
 *
 * ```typescript
 * import { validate } from 'yup-decorator';
 *
 * const user = new User({ email: 'test', age: 27 });
 *
 *  validate({
 *    object: user,
 *    options: {
 *      strict: true,
 *      abortEarly: false,
 *    },
 *  }).then(err => {
 *    // err.name; // => 'ValidationError'
 *    // err.errors; // => ['Not a valid email']
 *  });
 *
 *  // you can also pass in the schema name as a string or a constructor
 *  isValidSync({ object: user, schemaName: 'user' });
 *  isValidSync({ object: user, schemaName: User });
 * ```
 */
function isValidSync({ schemaName, object, options }: IValidateArguments): boolean {
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
}): AnySchema {
  if (object === null || typeof object !== "object") {
    throw new Error("Cannot validate non object types");
  }

  if (typeof schemaName === "string") {
    return getNamedSchema(schemaName);
  }

  return getSchemaByType(schemaName ?? object.constructor);
}

type _GetSchemaOptions = {
  compose?: (schema: IEnYupSchema) => IEnYupSchema;
};

/**
 * Get the object schema
 *
 * @param {Function} type the object type
 * @param {_GetSchemaOptions} options
 * @returns {ObjectSchema}
 */
function _getObjectSchema(type: Function, options: _GetSchemaOptions): AnySchema {
  const { compose } = options;
  const schemaByType = getSchemaByType(type);

  if (schemaByType) {
    return compose?.(schemaByType) ?? schemaByType;
  }

  return _defineSchema(type, options);
}

type _DefineSchemaOptions = {
  compose?: (schema: IEnYupSchema) => IEnYupSchema;
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
function _defineSchema(target: Function, options: _DefineSchemaOptions): IEnYupSchema {
  const { compose, useTargetClass } = options;

  const schemaMap = metadataStorage.findSchemaMetadata(target);

  // compose shape
  const objectShape: Record<string, AnySchema> = Array.from(schemaMap?.entries() ?? []).reduce(
    (currentShape, [property, schema]) => {
      return { ...currentShape, [property]: schema };
    },
    {},
  );

  const targetSchema = createEnYupSchema({
    shape: objectShape,
    target,
    useTargetClass,
  });

  const composed = compose?.(targetSchema) ?? targetSchema;

  _allSchemas.set(target, composed);
  return composed;
}

/**
 * Compose a lazy schema where value must be an object
 * and each entry must be [key: string]: valueSchema
 *
 * @param {AnySchema} valueSchema
 * @param {Function} objectSchema
 * @returns {LazySchema}
 */
function _recordSchema(
  valueSchema: AnySchema,
  objectSchema: (schema: AnySchema) => AnySchema = (id) => id,
): Lazy<any, any, any> {
  return yupLazy((object) => {
    if (object && typeof object === "object" && !Array.isArray(object)) {
      // dynamic shape for each key in the object
      const shape = Object.keys(object).reduce<Record<string, AnySchema>>((acc, key) => {
        acc[key] = valueSchema;
        return acc;
      }, {});

      return objectSchema(yupObject().shape(shape));
    }

    return objectSchema(yupObject());
  });
}

const a = yup;
const an = yup;

export type { IValidateArguments, IValidatePathArguments, IEnYupSchema };
export {
  cast,
  isValidSync,
  getNamedSchema,
  getSchemaByType,
  namedSchema,
  nestedObject,
  nestedType,
  nestedArray,
  schema,
  a,
  an,
  isValid,
  validate,
  validateSync,
  validateSyncAt,
  validateAt,
  is,
};
