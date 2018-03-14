"use strict";

class FileInfo
{
	constructor(values)
	{
		Object.assign(this, values);
	}

	getThumb(width, height, crop)
	{
		let uri = '/videos/' + this.db + '.' + this.id + '/poster' + width + 'x' + height;

		if (crop)
			uri += 'k1';

		uri += '_' + this.basename;

		if(this.thumbTS)
			uri += '_' + this.thumbTS;

		uri += '.jpg';

		return new FileThumb({
			name: this.name,
			width: crop ? width : 'todo',
			height: crop ? height : 'todo',
			uri: uri,
			originalUri: this.uri,
			ts: this.thumbTS
		});
	}
}

class FileThumb {
	constructor(values){
		Object.assign(this, values);
	}

	toHtml(){
		return '<a href="' + this.originalUri + '"><img src="' + this.uri + '" alt="' + this.name + '"/></a>';
	}
}

module.exports = FileInfo;
