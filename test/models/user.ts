import { a, is, namedSchema } from '../../src/index';

@namedSchema('user', { useTargetClass: true })
class User {
  constructor(args: { name: string }) {
    this.name = args.name;
  }

  @is(a.string().required('Name is required'))
  public name: string;
}

export { User };
