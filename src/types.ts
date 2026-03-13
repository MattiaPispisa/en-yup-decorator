import { Lazy, AnySchema } from "yup";

type PropertyName = string | symbol;
type PropertySchema = AnySchema | Lazy<any, any, any>;
type TargetPropertiesSchemas = Map<PropertyName, PropertySchema>;
type TargetClass = Function;

export type { PropertyName, PropertySchema, TargetClass, TargetPropertiesSchemas };
