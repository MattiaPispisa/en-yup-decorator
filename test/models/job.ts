import { is, a, an, namedSchema, nestedArray } from '../../src/index';

export class Office {
  constructor(args: { name: string; location: string }) {
    this.name = args.name;
    this.location = args.location;
  }

  @is(a.string().required('Office name is required'))
  name: string;

  @is(a.string().required('Office location is required'))
  location: string;
}

@namedSchema('job')
export class Job {
  constructor(args: { jobTitle: string; office: Office[] }) {
    this.jobTitle = args.jobTitle;
    this.office = args.office;
  }

  @is(
    a
      .string()
      .uppercase('Job title must be upper case')
      .required('Job title is required and must be upper case')
  )
  jobTitle: string;

  @nestedArray(() => Office, an.array().min(1, 'Office is required'))
  office: Office[];
}
