import {BinDataImage, GridFSVideo, LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";
import {handleBdiRequest} from "./bdf";

export default async function (req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	handleBdiRequest(req, res, notCached)
		.catch(next);
}

async function notCached(req: LipthusRequest): Promise<Buffer> {
	const r = req.params.fn.match(/^([^-]+)(-(\d+)x?(\d*))?\.jpg$/);

	if (!r)
		throw 404;

	const id = r[1];

	const video = await req.site.dbs[req.params.db].fsfiles.findById(id)
		.select('thumb');

	if (!video)
		throw 404;

	let thumb;

	if (!thumb) {
		const fullVideo: GridFSVideo = await req.site.dbs[req.params.db].fs.getVideo(id).load();

		thumb = await fullVideo.getThumb();
	} else
		thumb = BinDataImage.fromMongo(video.thumb);

	const width = parseInt(r[3], 10);

	if (!width)
		return video.thumb.MongoBinData.buffer;

	return thumb.toBuffer({
		width: width,
		height: parseInt(r[4], 10) || (video.thumb.height * width / video.thumb.width)
	});
}
