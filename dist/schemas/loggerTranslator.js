"use strict";

module.exports = function loggerTranslator(Schema){
	const s = new Schema({
		to: String,
		service: String,
		chars: Number,
		stack: Array,
		done: Boolean,
		src: String
	}, {
		collection: 'logger.translator',
		versionKey: false,
		created: true
	});
	
	s.statics = {
		log: function(src, to, service, done, logsrc, cb){
			let chars = 0;
			const stack = new Error().stack.split('\n');
			
			if(typeof src === 'string')
				chars = src.length;
			else {
				src.forEach(function(s){
					chars += s.length;
				});
			}
			
			this.create({
				to: to,
				service: service,
				chars: chars,
				stack: [stack[3], stack[4], stack[5]],
				done: done,
				src: logsrc
			}, cb);
		},
		getReport: function(){
			const o = {};

			o.map = function () {
				emit(this.service, this.chars);
			};
			
			o.reduce = function (k, vals) {
				var chars = 0;
				
				vals.forEach(function(v){
					chars += v;
				});
				
				return chars;
			};

			return this.mapReduce(o)
				.then(result => {
					const ret = {};

					result.forEach(function(r){
						ret[r._id] = r.value;
					});

					return ret;
				});
		}
	};
	
	s.methods = {
		setDone: function(done, cb){
			this.set('done', done);
			
			this.save(function(err){
				cb && cb(err);
			});
		}
	};
	
	return s;
};
