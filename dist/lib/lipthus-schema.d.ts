import { Schema } from "mongoose";
import "./query";
import * as mls from "../modules/schema-types/mlselector";
import * as mlBdf from "../modules/schema-types/bdf";
import * as mlBdfL from "../modules/schema-types/bdf-list";
import * as mlFs from "../modules/schema-types/fs";
import { MultilangType, MultilangText as MultilangTextClass } from "../modules/schema-types/mltext";
import { MlCheckboxes as MlCheckboxesClass } from "../modules/schema-types/mlcheckboxes";
export declare class LipthusSchema extends Schema {
    options: any;
    tree: any;
    db: any;
    static Types: typeof Schema.Types;
    paths: any;
    constructor(obj: any, options?: any);
    __setExtraOptions(): void;
    fileFields(): string[];
    getTypename(k: string): any;
    toString(): any;
    getTitle(): any;
    __setEvents(): void;
}
export declare let SchemaTypes: typeof LipthusSchema.Types;
export declare namespace LipthusSchemaTypes {
    const ObjectId: typeof Schema.Types.ObjectId;
    const MlSelector: typeof mls.MlSelector;
    const MlCheckboxes: typeof MlCheckboxesClass;
    const Bdf: typeof mlBdf.Bdf;
    const BdfList: typeof mlBdfL.BdfList;
    const Fs: typeof mlFs.Fs;
    const FsList: typeof mlFs.FsList;
    const Multilang: typeof MultilangType;
    const MultilangText: typeof MultilangTextClass;
}
