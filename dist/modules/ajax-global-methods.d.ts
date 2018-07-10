import { LipthusRequest } from "../index";
export declare class AjaxGlobalMethods {
    req: LipthusRequest;
    constructor(req: LipthusRequest);
    main(): any;
    setConfig(name: string, value: any, ns: string): any;
    loginInfo(): any;
    storeFcmToken(params: any): Promise<{
        ok: boolean;
    }> | {
        ok: boolean;
    };
}
export default AjaxGlobalMethods;
