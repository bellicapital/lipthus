import { LipthusSchema } from "../lib";
import { Document, Model } from "mongoose";
declare namespace LipthusSettings {
    const name = "settings";
    class SettingMethods {
        getValue(this: any, lang?: string): any;
    }
    class SettingStatics {
        getValues(this: any, lang?: string, query?: any): any;
        getValue(this: any, key: string, lang?: string): any;
        setValue(this: any, key: string, value: any, type?: string): any;
    }
    function getSchema(): LipthusSchema;
    interface Setting extends Document, SettingMethods {
    }
    interface SettingModel extends Model<Setting>, SettingStatics {
    }
}
export = LipthusSettings;
