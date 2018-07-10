import { Site } from "./site";
import { NextFunction } from "express";
import { LipthusRequest, LipthusResponse } from "../index";
export declare const session: (site: Site) => (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => void;
