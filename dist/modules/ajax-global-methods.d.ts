import { LipthusRequest } from "../index";
import { KeyString } from "../interfaces/global.interface";
export declare class AjaxGlobalMethods {
    req: LipthusRequest;
    constructor(req: LipthusRequest);
    main(): Promise<any>;
    setConfig(name: string, value: any, ns: string): any;
    loginInfo(): Promise<LoginInfo>;
    storeFcmToken(params: any): Promise<{
        ok: boolean;
    }> | {
        ok: boolean;
    };
}
export default AjaxGlobalMethods;
export interface LoginInfo {
    LC: KeyString;
    user: any;
    msg?: string;
    registerMethods: {
        site: boolean;
        google: boolean;
        facebook: boolean;
    };
}
