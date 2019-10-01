import { NextFunction } from "express";
import { LipthusRequest, LipthusResponse } from "../index";
export default function (req: LipthusRequest, res: LipthusResponse, next: NextFunction): void;
export declare function handleBdiRequest(req: LipthusRequest, res: LipthusResponse, bdiGetter: Function): Promise<void>;
