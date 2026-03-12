# En Yup Decorators

Added TypeScript decorators support for [yup](https://github.com/jquense/yup)

## Table of Contents

- [En Yup Decorators](#en-yup-decorators)
  - [Table of Contents](#table-of-contents)
  - [Preface](#preface)
  - [Usage](#usage)
    - [Class instantiation](#class-instantiation)
  - [Example](#example)
  - [Migrations](#migrations)

## Preface

This library is a continuation of `yup-decorators`, enhanced with support for the latest versions of `yup` and `TypeScript`. I would like to thank the original creators of yup-decorators for their excellent work in providing a powerful and flexible way to work with yup schemas. This version aims to bring the same functionality while keeping up with updates to yup and modern TypeScript features, offering an improved and more seamless experience. See [Migration from yup-decorators](documentation/migrations/from-yup-decorators.md) for migration details.

## Usage

- Named schema

```typescript
import { a, is, namedSchema, getNamedSchema } from "yup-decorator";

@namedSchema("user")
class User {
  constructor({ email, age }) {
    this.email = email;
    this.age = age;
  }
  @is(a.string().email("Not a valid email"))
  email: string;

  @is(a.number().lessThan(80).moreThan(10))
  age: number;
}

// you can get the yup schema with
const userSchema = getNamedSchema("user");
```

- Unnamed schema

```typescript
import { schema, getSchemaByType } from 'yup-decorator';

@schema()
class User {
	...
}

// you can get the yup schema with
const userSchema = getSchemaByType(User);
```

- Nested validation

```typescript
import { is, a, an, nestedType, schema } from "en-yup-decorator";

@schema()
export class NestedChildModel {
  @is(a.string().uppercase())
  uppercase: string;
}

@schema()
export class NestedModel {
  @is(an.array().of(a.number()).min(2).max(3))
  array: number[];

  @nestedType(() => NestedChildModel)
  child: NestedChildModel;
}
```

- Validate:

```typescript
import { validate } from "yup-decorator";

const user = new User({ email: "test", age: 27 });

validate({
  object: user,
  options: {
    strict: true,
    abortEarly: false,
  },
}).then((err) => {
  // err.name; // => 'ValidationError'
  // err.errors; // => ['Not a valid email']
});

// you can also pass in the schema name as a string or a constructor
validate({ object: user, schemaName: "user" });
validate({ object: user, schemaName: User });
```

The sync version is `validateSync`

- Check if object is valid or not

```typescript
import { isValid } from "yup-decorator";
isValid({ object: user }).then((isValid) => console.log(isValid));
```

The sync version is `isValidSync`

- Validate property at path

```typescript
import { validateAt } from "yup-decorator";
validateAt({ object: user, path: "email" }).then((e) => console.error(e));
```

The sync version is `validateSyncAt`

- Cast object.

This will coerce the property's value according to its type

```typescript
import { cast } from "yup-decorator";
const user = new User({ email: "test", age: "27" });
const result = cast({ object: user });
result; // {email: 'test@gmail.com', age: 27 }
```

The sync version is `isValidSync`

---

### Class instantiation

```typescript
@schema({ useTargetClass: true })
class Job {
  constructor(args: { name: string }) {
    this.name = args.name;
  }

  @is(a.string().required())
  name: string;
}

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

const user: User = await validate({
  object: {
    job: { name: "Dev" },
    name: "Mattia",
    birthday: new Date().toString(),
  },
  schemaName: User,
});

console.log(user instanceof User, user.birthday instanceof Date, user.job instanceof Job); // true, true, true
```

## Example

An example where each property uses one of the various provided APIs

```typescript
@schema()
class Person {
  constructor(args: {}) {
    ...
  }

  @is(a.string().required('Name is required')) // `is` lets you register a schema to the given property
  name: string

  @nestedObject(() => Person) // `nestedObject` lets you register an object where each value is of the given type
  contacts: Record<string, Person>

  @nestedArray(() => House) // `nestedArray` lets you register an array of the given type
  houses: House[]

  @nestedType(() => Job, (s) => s.required()) // `nestedType` lets you register an object schema, with optional composition
  job: Job

  @nestedType(() => Country) // `nestedType` lets you register an object schema to the given property
  country: Country
}
```

## Migrations

- [Migration from v1 to v2](documentation/migrations/from-v1-to-v2.md) — Migrate from legacy decorators (reflect-metadata) to TC39 Stage 3 decorators.
- [Migration from yup-decorators](documentation/migrations/from-yup-decorators.md) — Migrate from the original yup-decorators library.
