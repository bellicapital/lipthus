import { LipthusRequest, LipthusResponse } from "../index";
import { NextFunction } from "express";
export declare namespace util {
    class CastErr404 extends Error {
        status: number;
        static code: number;
        constructor(v: string);
    }
    function objectIdMw(req: LipthusRequest, res: LipthusResponse, next: NextFunction): void;
    function urlContent(url: string | any, encoding?: string): Promise<{}>;
}
