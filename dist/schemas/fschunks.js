/* global module, Buffer */

module.exports = function fschunks(Schema){
	return new Schema({
		files_id: {type: Schema.Types.ObjectId, ref: 'fsfiles' },
		n: Number,
		data: Buffer
	}, {
		collection: 'fs.chunks'
	});
};