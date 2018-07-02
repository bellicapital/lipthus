import { NextFunction } from "express";
import { LipthusRequest, LipthusResponse } from "../index";
export declare function errorHandler(err_: Error | string, req: LipthusRequest, res: LipthusResponse, next: NextFunction): void;
