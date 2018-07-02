"use strict";

class Image {
	constructor(file) {
		this.width;
		this.height;

		Object.assign(this, file);
	}

	fitCalc(max_width, max_height, crop) {
		return Image.fitCalc(this.width, this.height, max_width, max_height, crop);
	}

	static fitCalc(width, height, max_width, max_height, crop) {
		if (width <= max_width && height <= max_height)
			return {
				width: width,
				height: height
			};

		if (!crop) {
			const s = Math.min(max_width / width, max_height / height);

			return {
				width: parseInt(s * width),
				height: parseInt(s * height)
			};
		}

		return {
			width: width > max_width ? max_width : width,
			height: height > max_height ? max_height : height
		};
	}
}

module.exports = Image;
