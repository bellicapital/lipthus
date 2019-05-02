import {NextFunction} from "express";
import {LipthusRequest, LipthusResponse} from "../../index";
import email from "./email";

const methods: any = {
	email: email
};

export = (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
	methods[req.params.method](req, res)
		.catch(next);
};
