import { Person } from './models/person';
import { validate } from '../src/index';
import { Employee } from './models/employee';
import { Address, House } from './models/house';
import { Job } from './models/job';

describe('validate complex object', function () {
  describe('test validate', function () {
    it('should allow valid objects', async () => {
      const object = getValidEmployee();
      const actual = await validate({ object, schemaName: Employee });
      expect(actual).toEqual(object);
    });

    it('should validate nested record', async () => {
      const object = getValidEmployee({
        contacts: {
          '1': getValidEmployee(),
          '2': getValidEmployee(),
        }
      })
      const actual = await validate({ object, schemaName: Employee });
      expect(actual).toEqual(object);
    })

    it('should reject invalid objects', async () => {
      const object = getInvalidEmployee();
      await expect(
        validate({ object, schemaName: Employee })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        errors: ['Employee ID is required'],
      });
    });

    it('should reject invalid nestedRecord', async () => {
      const object = getValidEmployee({
        contacts: {
          '1': getValidEmployee(),
          '2': new Person({ age: 120, house: undefined, email: 'test' }),
        }
      })
      await expect(
        validate({
          object,
          schemaName: Employee,
          options: { strict: true, abortEarly: false }
        })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        errors: ['Not a valid email', 'contacts.2.age must be less than 100'],
      });
    })

    it('should reject invalid nestedRecord', async () => {
      const object = getValidEmployee({
        contacts: true as any
      })
      await expect(
        validate({
          object,
          schemaName: Employee,
          options: { strict: true, abortEarly: false }
        })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        errors: ['contacts must be a `object` type, but the final value was: `true`.'],
      });
    })

    it('should accept validate options', async () => {
      let object = getInvalidEmployee();
      await expect(
        validate({
          object,
          schemaName: Employee,
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
          'Job title must be upper case',
          'Office name is required',
          'Office location is required',
          'Employee ID is required',
        ],
      });

      object = getInvalidEmployee({ includesJob: false });
      await expect(
        validate({
          object,
          schemaName: Employee,
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
          'Job is required',
          'Employee ID is required',
        ],
      });

      object = getInvalidEmployee({ includesOffice: false });
      await expect(
        validate({
          object,
          schemaName: Employee,
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
          'Job title is required and must be upper case',
          'Employee ID is required',
        ],
      });

      object = getInvalidEmployee({ includesHouse: false });
      await expect(
        validate({
          object,
          schemaName: Employee,
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
          'Job title must be upper case',
          'Office name is required',
          'Office location is required',
          'Employee ID is required',
        ],
      });
    });

    it('should infer object type', async () => {
      const object = getInvalidEmployee({ includesHouse: false });
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
        errors: [
          'Not a valid email',
          'age must be greater than 0',
          'Job title must be upper case',
          'Office name is required',
          'Office location is required',
          'Employee ID is required',
        ],
      });
    });

    it('should use schema name', async () => {
      const object = getInvalidEmployee();
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
  });
});

function getValidEmployee({
  email,
  age,
  address,
  houseType,
  contacts = {},
}: {
  email?: any;
  array?: any;
  age?: any;
  address?: string;
  houseType?: string;
  contacts?: Record<string, Person>
} = {}) {
  return new Employee({
    employeeId: '123',
    age: ifNullOrUndefined(age, 20),
    email: ifNullOrUndefined(email, 'test@gmail.com'),
    job: new Job({
      jobTitle: 'DEVELOPER',
      office: [
        {
          location: 'Italy',
          name: 'South Office',
        },
        {
          location: 'Italy',
          name: 'North Office',
        },
      ],
    }),
    house: new House({
      type: houseType ?? 'VILLA',
      address: new Address({ location: address ?? 'Italy' }),
    }),
    contacts,
  });
}

function getInvalidEmployee({
  email,
  age,
  houseType,
  includesHouse = true,
  includesJob = true,
  includesOffice = true,
  includeContacts = true,
}: {
  email?: any;
  age?: any;
  houseType?: string;
  includesHouse?: boolean;
  includesJob?: boolean;
  includesOffice?: boolean;
  includeContacts?: boolean;
} = {}) {
  return new Employee({
    age: ifNullOrUndefined(age, -1),
    email: email ?? 'test',
    job: includesJob
      ? new Job({
        jobTitle: includesOffice ? 'dev' : undefined,
        office: includesOffice ? [{} as any] : undefined,
      } as any)
      : undefined,
    house: includesHouse
      ? new House({
        type: houseType ?? 'HOUSE',
      } as any)
      : undefined,
    contacts: includeContacts ? {} : undefined,
  } as any);
}

function ifNullOrUndefined<T>(value: T | undefined, fallback: T): T {
  return value === undefined || value === null ? fallback : value;
}
