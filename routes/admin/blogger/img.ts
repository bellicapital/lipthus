import {Response, NextFunction} from "express";

export function bloggerImage(req: any, res: Response, next: NextFunction) {
	const idx = parseInt(req.params.imgidx, 10) - 1;
	const schema = req.params.schema;
	const id = req.params.id;
	
	req.db[schema]
		.findById(id, 'image')
		.then((post?: any) => {
			if (!post || !post.image)
				return next();
			
			const img = post.image[Object.keys(post.image)[idx]];
			
			if (!img)
				return next();
			
			return img.send(req, res);
		})
		.catch(next);
}
