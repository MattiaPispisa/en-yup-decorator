import { Friend, User } from './models/user';
import { a, getSchemaByType, validate } from '../src/index';

describe('EnYupSchema method ', () => {
  describe('preserve class instances', function () {
    it('should convert valid objects in instances', async () => {
      const actual = await validate({
        object: getValidObject(),
        schemaName: 'user',
      });
      expect(actual).toEqual(getValidUser());
      expect(actual instanceof User).toBe(true);
    });

    it('should convert valid objects in instances', async () => {
      const actual = await validate({
        object: getValidObject(),
        schemaName: 'user',
      });
      expect(actual).toEqual(getValidUser());
      expect(actual instanceof User).toBe(true);
    });

    it('should convert valid objects in instances', async () => {
      const actual = await validate({
        object: getValidObject(),
        schemaName: User,
      });

      expect(actual).toEqual(getValidUser());
      expect(actual instanceof User).toBe(true);
    });

    it('should preserve instances', async () => {
      const object = getValidUser();
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
        errors: ['Name is required', 'Date is required'],
      });
    });
  });

  it('should pick', async () => {
    expect(
      getSchemaByType(User)
        .pick(['name'])
        .describe()
    ).toEqual(a.object({ name: a.string().required() }).describe());
  });

  it('should omit', async () => {
    expect(
      getSchemaByType(User)
        .omit(['name', 'friends'])
        .describe()
    ).toEqual(a.object({ birthday: a.date().required() }).describe());
  });
});

const birthday = new Date(1997, 11, 12);

function getValidUser() {
  return new User({ name: 'Mattia', birthday, friends: { '1': new Friend({ name: "Vincenzo", }) } });
}

function getValidObject() {
  return { name: 'Mattia', birthday: birthday.toString(), friends: { '1': { name: "Vincenzo" } } };
}
