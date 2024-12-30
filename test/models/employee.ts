import { a, is, namedSchema, nested } from '../../src/index';
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
  }) {
    super(args);
    this.job = args.job;
    this.employeeId = args.employeeId;
  }

  @nested(schema => schema.required('Job is required'))
  job: Job;

  @is(a.string().required('Employee ID is required'))
  employeeId: string;
}
