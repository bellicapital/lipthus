export class FileInfo implements FileInfoParams {

	id: string;
	uri: string;
	db: string;
	name: string;
	basename?: string;
	/**
	 * thumbnail timestamp
	 */
	thumbTS?: number;
	size?: number;
	key?: string;
	lastModifiedDate?: Date;
	contentType?: string;
	thumb?: string;
	versions?: any;
	folder?: string;
	md5?: string;
	submitter?: string;
	error?: Error;
	width?: number;
	height?: number;
	duration?: number;

	constructor(values: FileInfoParams) {
		this.id = values.id;
		this.uri = values.uri;
		this.db = values.db;
		this.name = values.name || '';

		Object.assign(this, values);
	}

	// noinspection JSUnusedLocalSymbols
	getThumb(width: number, height: number, crop: boolean, enlarge?: boolean) {
		let uri = '/videos/' + this.db + '.' + this.id + '/poster' + width + 'x' + height;

		if (crop)
			uri += 'k1';

		uri += '_' + this.basename;

		if (this.thumbTS)
			uri += '_' + this.thumbTS;

		uri += '.jpg';

		return new FileThumb({
			name: this.name,
			width: crop ? width : 0, // 'todo',
			height: crop ? height : 0, // 'todo',
			uri: uri,
			originalUri: this.uri,
			ts: this.thumbTS
		});
	}
}

export class FileThumb implements FileThumbParams {

	name: string;
	width: number;
	height: number;
	uri: string;
	originalUri: string;
	ts?: number;

	constructor(p: FileThumbParams) {
		this.name = p.name;
		this.width = p.width;
		this.height = p.height;
		this.uri = p.uri;
		this.originalUri = p.originalUri;
		this.ts = p.ts;
	}

	toHtml() {
		return '<a href="' + this.originalUri + '"><img src="' + this.uri + '" alt="' + this.name + '"/></a>';
	}
}

export interface FileInfoParams {
	id: string;
	uri: string;
	db: string;
	name?: string;
	basename?: string;
	/**
	 * thumbnail timestamp
	 */
	thumbTS?: number;
	size?: number;
	key?: string;
	lastModifiedDate?: Date;
	contentType?: string;
	thumb?: string;
	versions?: any;
	folder?: string;
	md5?: string;
	submitter?: string;
	error?: Error;
}

export interface FileThumbParams {
	name: string;
	width: number;
	height: number;
	uri: string;
	originalUri: string;
	/**
	 * thumbnail timestamp
	 */
	ts?: number;
}
