import type { AnyObject, Schema } from 'yup';

type PropertyName = string | symbol;
type PropertySchema = Schema<AnyObject>;
type TargetPropertiesSchemas = Map<PropertyName, PropertySchema>;
type TargetClass = Function;

export type {PropertyName,PropertySchema,TargetClass,TargetPropertiesSchemas}