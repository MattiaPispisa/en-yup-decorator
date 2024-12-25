import { a, namedSchema } from '../../src/index';

@namedSchema(
  'user',
  a.object({ name: a.string().required('Name is required') })
)
class User {
  constructor(args: { name: string }) {
    this.name = args.name;
  }

  public name: string;
}

export { User };
