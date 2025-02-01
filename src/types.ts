import { Lazy, Schema } from 'yup';

type PropertyName = string | symbol;
type PropertySchema = Schema<any> | Lazy<Schema<any>>;
type TargetPropertiesSchemas = Map<PropertyName, PropertySchema>;
type TargetClass = Function;

export { PropertyName, PropertySchema, TargetClass, TargetPropertiesSchemas };
