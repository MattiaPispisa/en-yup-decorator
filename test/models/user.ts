import { a, is, namedSchema } from '../../src/index';

@namedSchema('user', { useTargetClass: true })
class User {
  constructor(args: { name: string; birthday: Date }) {
    this.name = args.name;
    this.birthday = args.birthday;
  }

  @is(a.string().required('Name is required'))
  public name: string;

  @is(a.date().required('Date is required'))
  public birthday: Date;
}

export { User };
