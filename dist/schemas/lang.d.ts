import { LipthusSchema } from "../lib";
import { Document, Model } from "mongoose";
import { MultilangText } from "../modules/schema-types/mltext";
export declare const name = "lang";
export declare function getSchema(): LipthusSchema;
export declare class LipthusLanguageMethods {
    values(this: LipthusLanguage): any;
}
export declare class LipthusLanguageStatics {
    get(this: LipthusLanguageModel, n: string): import("mongoose").DocumentQuery<LipthusLanguage, LipthusLanguage, {}>;
    getValues(this: LipthusLanguageModel, n: string): Promise<any>;
    load(this: LipthusLanguageModel, tag: string, code: string): import("mongoose").DocumentQuery<LipthusLanguage[], LipthusLanguage, {}>;
    getMlTag(this: LipthusLanguageModel, tag: string | Array<string>): Promise<any>;
    getMlTag_(this: LipthusLanguageModel, tag: string): Promise<any>;
    check(this: LipthusLanguageModel): Promise<void>;
}
export interface LipthusLanguage extends Document, LipthusLanguageMethods {
    code: string;
    title: {
        [s: string]: MultilangText;
    };
    getLangList: (lang: string) => {
        [code: string]: string;
    };
}
export interface LipthusLanguageModel extends Model<LipthusLanguage>, LipthusLanguageStatics {
}
