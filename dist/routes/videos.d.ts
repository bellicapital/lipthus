import { LipthusRequest, LipthusResponse } from "../index";
import { NextFunction } from "express";
export default function (req: LipthusRequest, res: LipthusResponse, next: NextFunction): void | Promise<void>;
