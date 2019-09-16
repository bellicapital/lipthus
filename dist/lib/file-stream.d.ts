import { LipthusRequest, LipthusResponse } from "../index";
export declare class LipthusFile {
    file: string;
    params: any;
    private _stat;
    constructor(file: string, params: any);
    send(req: LipthusRequest, res: LipthusResponse, params?: SendFileParams): Promise<void>;
    stat(): Promise<any>;
}
export interface SendFileParams {
    filename?: string;
    disposition?: 'attachment' | 'inline';
    expireDays?: number;
}
