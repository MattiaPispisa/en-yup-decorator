# Migration from v1 to v2

This guide describes how to migrate from en-yup-decorator v1.x (legacy decorators with `reflect-metadata`) to v2.x (TC39 Stage 3 decorators).

## Summary of Changes

- **TC39 decorators:** The library now uses the standard TC39 Stage 3 decorators instead of TypeScript's legacy experimental decorators.
- **No reflect-metadata:** The library no longer depends on `reflect-metadata`. Remove it from your dependencies.
- **Removed `nested`:** TC39 field decorators do not receive the class or property type, so we can no longer infer the field's class at runtime. Use `nestedType(() => Type)` instead.

## Requirements

- TypeScript 5.0+
- Remove `experimentalDecorators` and `emitDecoratorMetadata` from your `tsconfig.json`

## Breaking Changes

| Removed                | Replacement                            | Notes                                                                                        |
| ---------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `@nested()`            | `@nestedType(() => Type)`              | Type inference via `reflect-metadata` is no longer supported. You must pass a type function. |
| `@nested(schema => …)` | `@nestedType(() => Type, schema => …)` | Same as above, with schema composition as second argument.                                   |

## Migration Steps

### 1. Update tsconfig.json

Remove the legacy decorator options:

```diff
{
  "compilerOptions": {
-   "emitDecoratorMetadata": true,
-   "experimentalDecorators": true,
```

### 2. Replace `@nested()` with `@nestedType(() => Type)`

```diff
- @nested()
- house?: House;
+ @nestedType(() => House)
+ house?: House;
```

### 3. Replace `@nested(schema => …)` with `@nestedType(() => Type, schema => …)`

```diff
- @nested((schema) => schema.required("Job is required"))
- job: Job;
+ @nestedType(() => Job, (schema) => schema.required("Job is required"))
+ job: Job;
```

### 4. Add `@schema()` to nested classes without a class decorator

Classes used in `@nestedType`, `@nestedArray`, or `@nestedObject` must have `@schema()` or `@namedSchema()` for their metadata to be registered:

```diff
+ @schema()
export class Office {
  @is(a.string().required())
  name: string;
}
```
