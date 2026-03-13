# [Unreleased]

### Changed

- **Migrated to TC39 Stage 3 decorators.** The library no longer depends on `reflect-metadata`. TypeScript's `experimentalDecorators` and `emitDecoratorMetadata` are no longer required.
- **Removed `nested`.** TC39 field decorators do not receive the class or property type, so we can no longer infer the field's class. Use `nestedType(() => Type)` instead. See [Migration from v1 to v2](documentation/migrations/from-v1-to-v2.md) for details.

# 1.2.0 (2025-02-09)

### Added

- `nestedObject` to register an object where each value is of the given property

### Changed

- `@is` also accept yup.lazy
- chore: more documentation

# 1.1.0 (2025-01-04)

### Added

- `EnYupSchema` a schema with also `pick` and `omit`

### Changed

- `getSchemaByType` and `getNamedSchema` return `EnYupSchema`

# 1.0.0 (2024-12-30)

### Features

- first implementation of `en-yup-decorator`
