
export default class Image {

	public width: number;
	public height: number;

	constructor(file: any) {
		Object.assign(this, file);
		this.width = file.width;
		this.height = file.height;
	}

	fitCalc(max_width: number, max_height: number, crop: boolean) {
		return Image.fitCalc(this.width, this.height, max_width, max_height, crop);
	}

	static fitCalc(width: number, height: number, max_width: number, max_height: number, crop: boolean) {
		if (width <= max_width && height <= max_height)
			return {
				width: width,
				height: height
			};

		if (!crop) {
			const s = Math.min(max_width / width, max_height / height);

			return {
				width: Math.round(s * width),
				height: Math.round(s * height)
			};
		}

		return {
			width: width > max_width ? max_width : width,
			height: height > max_height ? max_height : height
		};
	}
}
