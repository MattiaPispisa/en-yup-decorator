import { a, is, nestedType, schema, validate } from 'en-yup-decorator';

@schema({ useTargetClass: true })
class Job {
  constructor(args: { name: string }) {
    this.name = args.name;
  }

  @is(a.string().required())
  name: string;
}

@schema({ useTargetClass: true })
class User {
  constructor(args: { name: string; job: Job; birthday: Date }) {
    this.name = args.name;
    this.job = args.job;
    this.birthday = args.birthday;
  }

  @is(a.string().required())
  name: string;

  @is(a.date().required())
  birthday: Date;

  @nestedType(
    () => Job,
    s => s.required()
  )
  job: Job;
}

async function main() {
  try {
    const user: User = await validate({
      object: {
        job: { name: 'Dev' },
        name: 'Mattia',
        birthday: new Date().toString(),
      },
      schemaName: User,
    });
    console.log(
      'user',
      user,
      user instanceof User,
      user.birthday instanceof Date,
      user.job instanceof Job
    );
  } catch (err) {
    console.error('Validation failed:', err);
  }
}

main();
