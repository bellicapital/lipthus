import { Site } from "./site";
import { LipthusRequest, LipthusResponse } from "../index";
import { NextFunction } from "express";
declare const _default: (site: Site) => (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => any;
export default _default;
