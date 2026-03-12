# Migration from yup-decorators

This guide describes the main differences when migrating from the original [yup-decorators](https://github.com/anon-pat/yup-decorators) to en-yup-decorator.

## Overview

en-yup-decorator is a continuation of yup-decorators, enhanced with support for the latest versions of yup and TypeScript. This version aims to bring the same functionality while keeping up with updates to yup and modern TypeScript features.

## Key Differences

### Schema annotation

en-yup-decorator creates instances of `EnYupSchema`. It is no longer possible to annotate a class as an object directly:

```typescript
// yup-decorators (no longer supported)
@namedSchema(a.object().required())

// en-yup-decorator
@namedSchema("user")
@schema()
```

Instead, use callbacks to compose the generated schema when needed:

```typescript
@nestedType(() => Job, (s) => s.required())
job: Job;
```

### Class instantiation during validation

en-yup-decorator supports converting validated objects into instances of the target class via `useTargetClass`:

```typescript
@schema({ useTargetClass: true })
class User {
  constructor(args: { name: string; job: Job; birthday: Date }) {
    this.name = args.name;
    this.job = args.job;
    this.birthday = args.birthday;
  }

  @is(a.string().required())
  name: string;

  @is(a.date().required())
  birthday: Date;

  @nestedType(() => Job, (s) => s.required())
  job: Job;
}

const user = await validate({ object: plainObject, schemaName: User });
// user instanceof User
// user.birthday instanceof Date
// user.job instanceof Job
```

### Dependencies

- `yup` >= 1.0.0 is required

## TC39 decorators (v2+)

If you are migrating from yup-decorators to en-yup-decorator v2.x, you will also need to follow the [Migration from v1 to v2](from-v1-to-v2.md) guide, as v2 uses TC39 Stage 3 decorators instead of legacy experimental decorators.
