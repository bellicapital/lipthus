import {Router} from "express";
import {bloggerImage} from "./img";
import {bloggerForm} from "./form";
import {bloggerList} from "./list";
import {bloggerHome} from "./home";
import {LipthusApplication} from "../../../index";

module.exports = (app: LipthusApplication) => {
	const router = Router({strict: true});

	router.get('/:schema/:id/img\\-:imgidx', bloggerImage);
	router.get('/:schema/:id/edit', bloggerForm);
	router.get('/:schema', bloggerList);
	router.get('/', bloggerHome);

	app.use('/blogger', router);
};
