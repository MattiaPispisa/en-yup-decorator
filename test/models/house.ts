import { is, a, namedSchema, nestedType } from '../../src/index';

export class Address {
  constructor(args: { location: string }) {
    this.location = args.location;
  }

  @is(a.string().required('House address is required'))
  location: string;
}

@namedSchema('house')
export class House {
  constructor(args: { address: Address; type: string }) {
    this.address = args.address;
    this.type = args.type;
  }

  @nestedType(() => Address)
  address: Address;

  @is(
    a
      .string()
      .uppercase('House type must be uppercase')
      .oneOf(
        ['UNIT', 'TOWNHOUSE', 'VILLA'],
        'House type must be one of the following values: UNIT, TOWNHOUSE, VILLA'
      )
      .required('House type is required')
  )
  type: string;
}
