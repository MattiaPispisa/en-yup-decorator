import { a, is, namedSchema, nested, nestedObject } from '../../src/index';
import { Job } from './job';
import { Person } from './person';
import { House } from './house';

@namedSchema('employee')
export class Employee extends Person {
  constructor(args: {
    job: Job;
    employeeId: string;
    email: string;
    age: number;
    house: House;
    contacts: Record<string, Person>
  }) {
    super(args);
    this.job = args.job;
    this.employeeId = args.employeeId;
    this.contacts = args.contacts;
  }

  @nested(schema => schema.required('Job is required'))
  job: Job;

  @is(a.string().required('Employee ID is required'))
  employeeId: string;

  @nestedObject(() => Person,(s) => s.required('Contacts are required'))
  contacts: Record<string, Person>
}
