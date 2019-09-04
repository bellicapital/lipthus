import { LipthusSchema } from "../lib";
import { LipthusRequest } from "../index";
import { KeyString } from "../interfaces/global.interface";
import { Document, Model } from "mongoose";
import { MultilangText } from "../modules/schema-types/mltext";
export declare const name = "nationalities";
export declare function getSchema(): LipthusSchema;
export interface Nationality extends Document, NationalitiesMethods {
    code: string;
    title: {
        [s: string]: MultilangText;
    };
    getLangList: (lang: string) => {
        [code: string]: string;
    };
}
export interface NationalitiesModel extends Model<Nationality>, NationalitiesStatics {
}
export declare class NationalitiesMethods {
}
export declare class NationalitiesStatics {
    getList(this: NationalitiesModel, req: LipthusRequest, lang?: string): Promise<KeyString>;
    getLangList(this: NationalitiesModel, lang: string): Promise<KeyString>;
    setVal(code: string, lang: string, value: string): any;
}
