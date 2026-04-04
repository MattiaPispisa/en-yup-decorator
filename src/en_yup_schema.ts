import * as yup from "yup";

/**
 * Extended {@link yup.Schema} interface with common {@link yup.ObjectSchema} methods.
 *
 * Includes pick, omit, partial, deepPartial, from, stripUnknown, noUnknown.
 */
type IEnYupSchema = Pick<
  yup.ObjectSchema<yup.AnyObject>,
  "pick" | "omit" | "partial" | "deepPartial" | "from" | "stripUnknown" | "noUnknown"
> &
  yup.Schema;

/**
 * a method that creates a {@link IEnYupSchema} instance
 */
function createEnYupSchema({
  target,
  useTargetClass,
  shape,
}: EnYupSchemaConstructorArguments): IEnYupSchema {
  if (useTargetClass) {
    return new EnYupSchema({ shape, target, useTargetClass });
  }
  return yup.object(shape)
}

type EnYupSchemaConstructorArguments = {
  target: Function;
  shape: Record<string, yup.AnySchema>;
  useTargetClass?: boolean;
};

class EnYupSchema extends yup.Schema implements IEnYupSchema {
  constructor({ shape, target }: EnYupSchemaConstructorArguments) {
    super({
      type: "en_yup_schema",
      check: (input): input is typeof target => input instanceof target,
    });
    this.schema = yup.object(shape);

    this.withMutation(() => {
      this.transform((value, _, ctx) => {
        if (ctx.isType(value)) {
          return value;
        }

        // apply cast and transform to the original value, 
        // in order to get the correct types for the constructor
        const castedData = this.schema.cast(value, {
          assert: false,
          stripUnknown: false
        });

        return new (target as any)(castedData);
      });

      this.test({
        name: 'en-yup-async-validation',
        test: async (value, testContext) => {
          try {
            // after cast value should be an instance of the target class
            await this.schema.validate(value, {
              abortEarly: testContext.options.abortEarly ?? false,
              strict: testContext.options.strict ?? false,
              context: testContext.options.context,
            });
            return true;
          } catch (err) {
            if (err instanceof yup.ValidationError) {
              return err;
            }
            throw err;
          }
        },
      });
    });
  }

  noUnknown(message?: yup.Message): yup.ObjectSchema<yup.AnyObject, yup.AnyObject, any, "">
  noUnknown(noAllow: boolean, message?: yup.Message): yup.ObjectSchema<yup.AnyObject, yup.AnyObject, any, "">
  noUnknown(noAllow?: yup.Message | boolean, message?: yup.Message): yup.ObjectSchema<yup.AnyObject, yup.AnyObject, any, ""> {
    if (typeof noAllow !== 'boolean') {
      return this.schema.noUnknown(noAllow);

    }
    return this.schema.noUnknown(noAllow, message);
  }

  private schema: yup.ObjectSchema<yup.AnyObject>;

  pick<TKey extends string | number>(
    keys: readonly TKey[],
  ): yup.ObjectSchema<{ [K in TKey]: yup.AnyObject[K] }, yup.AnyObject, any, ""> {
    return this.schema.pick(keys);
  }

  omit<TKey extends string | number>(
    keys: readonly TKey[],
  ): yup.ObjectSchema<
    { [K in Exclude<string, TKey> | Exclude<number, TKey>]: yup.AnyObject[K] },
    yup.AnyObject,
    any,
    ""
  > {
    return this.schema.omit(keys);
  }

  partial(): yup.ObjectSchema<yup.AnyObject> {
    return this.schema.partial();
  }

  deepPartial(): yup.ObjectSchema<yup.AnyObject> {
    return this.schema.deepPartial();
  }

  from(from: string, to: string, alias?: boolean): yup.ObjectSchema<yup.AnyObject> {
    return this.schema.from(from, to, alias);
  }

  stripUnknown(): yup.ObjectSchema<yup.AnyObject> {
    return this.schema.stripUnknown();
  }
}

export type { IEnYupSchema };
export { createEnYupSchema };
