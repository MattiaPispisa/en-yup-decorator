import {
  cast,
  isValid,
  isValidSync,
  validate,
  validateAt,
  validateSync,
  validateSyncAt,
} from '../src/index';
import { Person } from './models/person';
import { Address, House } from './models/house';
import { User } from './models/user';

describe('validate simple object', function() {
  describe('test validate', function() {
    it('should allow valid objects', async () => {
      const object = getValidPerson();
      const actual = await validate({ object, schemaName: Person });
      expect(actual).toEqual(object);
    });

    it('should reject invalid objects', async () => {
      const object = getInvalidPerson();
      await expect(
        validate({ object, schemaName: Person })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        errors: [
          'House type must be one of the following values: UNIT, TOWNHOUSE, VILLA',
        ],
      });
    });

    it('should accept validate options', async () => {
      const object = getInvalidPerson();
      await expect(
        validate({
          object,
          schemaName: Person,
          options: { abortEarly: false, strict: true },
        })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        errors: [
          'Not a valid email',
          'age must be greater than 0',
          'House type must be one of the following values: UNIT, TOWNHOUSE, VILLA',
        ], // Specific error messages
      });
    });

    it('should infer object type', async () => {
      const object = getInvalidPerson({ includesHouse: false });
      await expect(
        validate({
          object,
          options: {
            strict: true,
            abortEarly: false,
          },
        })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        errors: ['Not a valid email', 'age must be greater than 0'],
      });
    });

    it('should use schema name', async () => {
      const object = getInvalidPerson();
      await expect(
        validate({
          object,
          schemaName: 'person',
          options: {
            strict: true,
            abortEarly: false,
          },
        })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        errors: [
          'Not a valid email',
          'age must be greater than 0',
          'House type must be one of the following values: UNIT, TOWNHOUSE, VILLA',
        ],
      });
    });

    it('should throw error validating null object', async () => {
      expect(() =>
        validate({ object: null, schemaName: Person } as any)
      ).toThrow(
        expect.objectContaining(new Error('Cannot validate non object types'))
      );
    });

    it('should allow valid objects', async () => {
      const object = getValidPerson();
      const actual = await validate({ object, schemaName: Person });
      expect(actual).toBe(object);
    });
  });

  describe('preserve class instances', function() {
    it('should convert valid objects in instances', async () => {
      const object = { name: 'Mattia' };
      const actual = await validate({
        object,
        schemaName: 'user',
      });

      expect(object).toEqual(actual);
      expect(actual instanceof User).toBe(true);
    });

    it('should convert valid objects in instances', async () => {
      const object = { name: 'Mattia' };
      const actual = await validate({
        object,
        schemaName: User,
      });

      expect(object).toEqual(actual);
      expect(actual instanceof User).toBe(true);
    });

    it('should preserve instances', async () => {
      const object = new User({ name: 'Mattia' });
      const actual = await validate({
        object,
        schemaName: User,
      });

      expect(object).toBe(actual);
      expect(actual instanceof User).toBe(true);
    });

    it('should reject invalid objects', async () => {
      const object = { name: '' };
      await expect(
        validate({ object, schemaName: User })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        errors: ['Name is required'],
      });
    });
  });
});

describe('test validate sync', function() {
  it('should allow valid objects', async () => {
    const object = getValidPerson();
    const actual = validateSync({ object, schemaName: Person });
    expect(actual).toBe(object);
  });

  it('should reject invalid objects', async () => {
    const object = getInvalidPerson();
    expect(() => {
      validateSync({
        object,
        schemaName: Person,
        options: { abortEarly: false },
      });
    }).toThrow(
      expect.objectContaining({
        name: 'ValidationError',
        errors: [
          'Not a valid email',
          'age must be greater than 0',
          'House type must be one of the following values: UNIT, TOWNHOUSE, VILLA',
        ],
      })
    );
  });
});

describe('validate object path', function() {
  describe('test validateAt', function() {
    it('should allow valid objects', async () => {
      const object = getValidPerson();
      const actual = await validateAt({
        object,
        schemaName: Person,
        path: 'email',
      });
      expect(actual).toBe(object.email);
    });

    it('should reject invalid objects', async () => {
      const object = getInvalidPerson();
      await expect(
        validateAt({
          object,
          schemaName: Person,
          path: 'email',
        })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        errors: ['Not a valid email'],
      });
    });

    it('should accept validate options', async () => {
      const object = getInvalidPerson({ email: 1 });
      await expect(
        validateAt({
          path: 'email',
          object,
          schemaName: Person,
          options: {
            strict: true,
          },
        })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        errors: [
          'email must be a `string` type, but the final value was: `1`.',
        ],
      });
    });
  });

  describe('test validateAtSync', function() {
    it('should allow valid objects', async () => {
      const object = getValidPerson();
      const actual = validateSyncAt({
        object,
        schemaName: Person,
        path: 'email',
      });
      expect(actual).toBe(object.email);
    });

    it('should reject invalid objects', async () => {
      const object = getInvalidPerson();
      expect(() =>
        validateSyncAt({
          object,
          schemaName: Person,
          path: 'email',
        })
      ).toThrow(
        expect.objectContaining({
          name: 'ValidationError',
          errors: ['Not a valid email'],
        })
      );
    });
  });
});

describe('Testing isValid', function() {
  describe('test isValid', function() {
    it('should allow valid objects', async () => {
      const object = getValidPerson();
      const result = await isValid({
        object,
        schemaName: Person,
      });
      expect(result).toBe(true);
    });

    it('should reject invalid objects', async () => {
      const object = getInvalidPerson();
      const result = await isValid({ object, schemaName: Person });
      expect(result).toBe(false);
    });
  });

  describe('test isValidSync', function() {
    it('should allow valid objects', async () => {
      const object = getValidPerson();
      const actual = isValidSync({
        object,
        schemaName: Person,
      });
      expect(actual).toBe(true);
    });

    it('should reject invalid objects', async () => {
      const object = getInvalidPerson();
      const actual = isValidSync({
        object,
        schemaName: Person,
      });
      expect(actual).toBe(false);
    });
  });
});

describe('Testing cast', function() {
  describe('test cast', function() {
    it('should coerce values', async () => {
      const object = getInvalidPerson({
        age: '1',
        houseType: 'house',
      });
      const actual = cast({ object, schemaName: Person });
      expect(actual).toEqual({
        ...object,
        age: 1,
        house: {
          ...object.house,
          address: {
            location: 'Italy',
          },
          type: 'HOUSE',
        },
      });
    });
  });
});

function getValidPerson({
  email,
  age,
  address,
  houseType,
}: {
  email?: string;
  age?: number;
  address?: string;
  houseType?: string;
} = {}): Person {
  return new Person({
    age: ifNullOrUndefined(age, 20),
    email: ifNullOrUndefined(email, 'test@gmail.com'),
    house: new House({
      address: new Address({ location: ifNullOrUndefined(address, 'Italy') }),
      type: ifNullOrUndefined(houseType, 'VILLA'),
    }),
  });
}

function getInvalidPerson({
  email,
  age,
  houseType,
  includesHouse = true,
}: {
  email?: any;
  age?: any;
  houseType?: any;
  includesHouse?: boolean;
} = {}) {
  return new Person({
    age: ifNullOrUndefined(age, -1),
    email: ifNullOrUndefined(email, 'test'),

    house: includesHouse
      ? new House({
          type: ifNullOrUndefined(houseType, 'HOUSE'),
          address: new Address({ location: 'Italy' }),
        })
      : undefined,
  });
}

function ifNullOrUndefined<T>(value: T | undefined, fallback: T): T {
  return value === undefined || value === null ? fallback : value;
}
