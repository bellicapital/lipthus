import { KeyValue } from "../typings";
export declare function Schema(p: SchemaDecoratorParams): (a: any) => any;
export interface SchemaDecoratorParams {
    definitions: any;
    statics?: KeyValue;
    methods?: KeyValue;
}
