import {GridFSFile} from "./gridfs-file";

export class GridFSVideo extends GridFSFile {

	public width!: number;
	public height!: number;
	public duration!: number;

	info() {
		const ret = super.info();

		if (this.width) {
			ret.width = this.width;
			ret.height = this.height;
			ret.duration = this.duration;
		}

		return ret;
	}

	load(): Promise<GridFSVideo> {
		return super.load()
			.then((file: GridFSFile) => <GridFSVideo>file);
	}
}
