import * as yup from 'yup';

type IEnYupSchema = Pick<yup.ObjectSchema<yup.AnyObject>, 'pick' | 'omit'> &
  yup.Schema;

/// a method that creates a {@link IEnYupSchema} instance
function createEnYupSchema({
  target,
  useTargetClass,
  shape,
}: EnYupSchemaConstructorArguments): IEnYupSchema {
  if (useTargetClass) {
    return new EnYupSchema({ shape, target, useTargetClass });
  }
  return yup.object(shape);
}

type EnYupSchemaConstructorArguments = {
  target: Function;
  shape: Record<string, yup.Schema>;
  useTargetClass?: boolean;
};

class EnYupSchema extends yup.Schema implements IEnYupSchema {
  constructor({ shape, target }: EnYupSchemaConstructorArguments) {
    super({
      type: 'en_yup_schema',
      check: (input): input is typeof target => input instanceof target,
    });
    this.schema = yup.object(shape);

    this.withMutation(() => {
      this.transform((value, _, ctx) => {
        const validData = this.schema.validateSync(value, {
          abortEarly: false,
          strict: false,
        });

        if (ctx.isType(value)) {
          return validData;
        }

        return new (target as any)(validData);
      });
    });
  }

  private schema: yup.ObjectSchema<yup.AnyObject>;

  pick<TKey extends string | number>(
    keys: readonly TKey[]
  ): yup.ObjectSchema<
    { [K in TKey]: yup.AnyObject[K] },
    yup.AnyObject,
    any,
    ''
  > {
    return this.schema.pick(keys);
  }

  omit<TKey extends string | number>(
    keys: readonly TKey[]
  ): yup.ObjectSchema<
    { [K in Exclude<string, TKey> | Exclude<number, TKey>]: yup.AnyObject[K] },
    yup.AnyObject,
    any,
    ''
  > {
    return this.schema.omit(keys);
  }
}

export { IEnYupSchema, createEnYupSchema };
