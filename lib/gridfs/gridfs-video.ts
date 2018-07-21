import {GridFSFile} from "./gridfs-file";
import {Types} from "mongoose";

export class GridFSVideo extends GridFSFile {

	public width!: number;
	public height!: number;
	public duration!: number;
	public versions?: { [s: string]: GridFSVideo | Types.ObjectId };

	info() {
		const ret = super.info();

		if (this.width) {
			ret.width = this.width;
			ret.height = this.height;
			ret.duration = this.duration;
		}

		return ret;
	}
}
