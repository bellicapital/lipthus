import { Site } from "./site";
import { NextFunction } from "express";
import { LipthusRequest, LipthusResponse } from "../index";
declare const _default: (site: Site) => (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => void;
export default _default;
