import { LipthusRequest, LipthusResponse } from "../index";
export declare class AjaxError extends Error {
    statusCode: number;
    constructor(msg: string, code: number);
}
export declare function AjaxMiddleware(req: LipthusRequest, res: LipthusResponse): void;
