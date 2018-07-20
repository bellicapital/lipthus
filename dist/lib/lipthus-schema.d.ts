import { Schema } from "mongoose";
import "./query";
import * as mls from "../modules/schema-types/mlselector";
import * as mlcb from "../modules/schema-types/mlcheckboxes";
import * as mlbdf from "../modules/schema-types/bdf";
import * as mlbdfl from "../modules/schema-types/bdf-list";
import * as mlfs from "../modules/schema-types/fs";
import * as mltext from "../modules/schema-types/mltext";
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
    const MlCheckboxes: typeof mlcb.MlCheckboxes;
    const Bdf: typeof mlbdf.Bdf;
    const BdfList: typeof mlbdfl.BdfList;
    const Fs: typeof mlfs.Fs;
    const FsList: typeof mlfs.FsList;
    const Multilang: typeof mltext.Multilang;
    const MultilangText: typeof mltext.MultilangText;
}
