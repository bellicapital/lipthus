import { Site } from "../site";
import { LipthusRequest } from "../../index";
import { Types } from "mongoose";
import ObjectId = Types.ObjectId;
export declare class ConfigVar {
    site: Site;
    _id: ObjectId;
    title: string;
    name: string;
    desc: string;
    formtype: string;
    value: any;
    options: any;
    constructor(options: any, site: Site);
    /**
     * necesario para que se actualicen las propiedades definidas en config
     * @returns {*}
     */
    getValue(): any;
    setValue(v: any): void;
    get4Edit(req: LipthusRequest): Promise<{
        id: string;
        name: string;
        value: any;
        formtype: string;
        caption: any;
        description: any;
        options: any;
    }>;
}
export declare class MultilangConfigVar extends ConfigVar {
    setValue(v?: any): void;
    get4Edit(req: LipthusRequest): Promise<any>;
}
export declare const ConfigVarInstance: (options: any, site: Site) => (any);
