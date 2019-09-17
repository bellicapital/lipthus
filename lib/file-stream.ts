import {LipthusRequest, LipthusResponse} from "../index";
import * as fs from "fs";
import {promisify} from "util";

const fsStat = promisify(fs.stat);

export class LipthusFile {

	private _stat: any;

	constructor(public file: string, public params: any) {
	}

	send(req: LipthusRequest, res: LipthusResponse, params: SendFileParams = {}) {
		const defaults = {
			expireDays: 60,
			disposition: 'inline',
			filename: 'file'
		};
		const opt: SendFileParams = Object.assign({}, defaults, params);

		return this.stat()
			.then((stat) => {
				let start = 0;
				let end = stat.size - 1;

				if (this.params.contentType)
					res.type(this.params.contentType);

				res.set('Accept-Ranges', 'bytes');
				res.set('Content-Disposition', opt.disposition + '; filename="' + opt.filename + '"');

				if (req.headers.range) {
					const r = /bytes[^\d]*(\d+)-(\d*)?/.exec(req.headers.range.toString());

					if (!r)
						throw new Error('headers.range parse error: ' + req.headers.range);

					start = parseInt(r[1], 10);

					if (r[2])
						end = parseInt(r[2], 10);

					res.status(206); // HTTP/1.1 206 Partial Content
					res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + stat.size);
				} else
					res.set('Content-Length', stat.size.toString());

				res.set('Last-modified', stat.mtime.toUTCString());
				res.set('Etag', stat.size + '-' + stat.mtime.getTime());

				const expires = new Date();
				expires.setDate(expires.getDate() + opt.expireDays);

				res.set('Expires', expires.toUTCString());

				if (this.params.duration)
					res.set('X-Content-Duration', this.params.duration + '');

				fs.createReadStream(this.file, { start, end }).pipe(res);
			});
	}

	stat () {
		if (this._stat)
			return Promise.resolve(this._stat);

		return fsStat(this.file)
			.then(r => this._stat = r);
	}

}

export interface SendFileParams {
	filename?: string;
	disposition?: 'attachment' | 'inline';
	expireDays?: number;
}
