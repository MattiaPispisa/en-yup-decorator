import { a, is, namedSchema, nestedObject, schema } from '../../src/index';

@schema({useTargetClass: true})
class Friend {
  constructor(args: { name: string }) {
    this.name = args.name;
  }

  @is(a.string().required('Name is required'))
  public name: string;
}

@namedSchema('user', { useTargetClass: true })
class User {
  constructor(args: { name: string; birthday: Date, friends?: Record<string, Friend> }) {
    this.name = args.name;
    this.birthday = args.birthday;
    this.friends = args.friends;
  }

  @is(a.string().required('Name is required'))
  public name: string;

  @is(a.date().required('Date is required'))
  public birthday: Date;

  @nestedObject(() => Friend)
  public friends?: Record<string, Friend>
}

export { User, Friend };
