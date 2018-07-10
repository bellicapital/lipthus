import { LipthusSchema } from "../lib";
import { LipthusRequest } from "../index";
import { Document, Model } from "mongoose";
import { MultilangText } from "../modules/schema-types/mltext";
export declare const name = "nationalities";
export declare function getSchema(): LipthusSchema;
export interface Nationality extends Document, NationalitiesMethods {
    code: string;
    title: {
        [s: string]: MultilangText;
    };
}
export interface NationalitiesModel extends Model<Nationality>, NationalitiesStatics {
}
export declare class NationalitiesMethods {
}
export declare class NationalitiesStatics {
    getList(req: LipthusRequest, lang?: string): any;
    getLangList(lang: string): any;
    setVal(code: string, lang: string, value: string): any;
}
