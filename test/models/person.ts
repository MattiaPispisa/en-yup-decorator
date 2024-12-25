import { a, is, namedSchema, nested } from '../../src/index';
import { House } from './house';

@namedSchema('person')
export class Person {
  constructor(args: { email: string; age: number; house?: House }) {
    this.email = args.email;
    this.age = args.age;
    this.house = args.house;
  }

  @is(a.string().email('Not a valid email'))
  email: string;

  @is(
    a
      .number()
      .lessThan(100)
      .moreThan(0)
  )
  age: number;

  @nested()
  house?: House;
}
