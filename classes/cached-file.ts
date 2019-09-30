import {existsSync} from "fs";

export class CachedFile {

	static get(file: string, params?: any) {
		if (existsSync(file))
			return new CachedFile(file, params);
	}

	constructor (public file: string, public params: any = {maxAge: '30d'}) {
	}

	send(res) {
		res.sendFile(this.file, this.params);
	}

}
