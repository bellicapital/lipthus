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

	// noinspection JSUnusedGlobalSymbols
	setThumbByPosition(position?: number) {
		return this.getVideoFrame(position).then((bdf: any) => {
			if (bdf) {
				bdf.setColRef({
					collection: this.namespace + '.files',
					id: this._id,
					field: 'thumb'
				});

				return this.update({thumb: bdf});
			}
		})
			.then(() => this.thumb);
	}
}
