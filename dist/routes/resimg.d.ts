import { LipthusRequest, LipthusResponse } from "../index";
import { NextFunction } from "express";
/**
 * Sends a resized image from public/img directory
 * Use /resimg/[width]x[height]k(crop)[01]_filename
 * ex: /resimg/340x200k1_logo.png, /resimg/340x200_logo.png
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
export default function (req: LipthusRequest, res: LipthusResponse, next: NextFunction): void;
