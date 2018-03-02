
export interface Hooks {
	pre: any;
	post: any;
}

/**
 * @deprecated Use LipthusRequest
 */
export {LipthusRequest as Request} from '../typings/lipthus';

/**
 * @deprecated Use LipthusResponse
 */
export {LipthusResponse as Response} from '../typings/lipthus';

/**
 * @deprecated Use LipthusApplication
 */
export {LipthusApplication as Application} from '../typings/lipthus';

export {NextFunction} from 'express';
