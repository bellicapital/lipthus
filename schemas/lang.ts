import {LipthusSchema} from "../lib";
import {Site} from "../modules";

const exec = require('child_process').exec;

const exclude = {
	_id: false,
	_mod: false,
	_tag: false,
	__v: false,
	modified: false,
	created: false
};

const excludeAll = [
	'_id',
	'_mod',
	'_k',
	'_tag',
	'__v',
	'modified',
	'created'
];

export const name = 'lang';

export function getSchema(site: Site) {
	const s = new LipthusSchema({
		_tag: String,
		_k: {type: String, index: true, unique: true}
	}, {
		collection: 'lang',
		strict: false,
		id: false
	});

	s.index({
		_k: 1,
		_tag: 1
	});

	s.methods = {
		values: function () {
			const ret = this.toObject();

			excludeAll.forEach(n => delete(ret[n]));

			return ret;
		}
	};

	s.statics = {
		get: function (n: string) {
			return this.findOne({_k: n});
		},
		getValues: function (n: string) {
			return this.get(n)
				.then((r: any) => r && (r as any).values());
		},
		load: function (tag: string, code: string) {
			const fields: any = {_id: false, _k: true};

			fields[code] = true;

			return this.find({_tag: tag}, fields);
		},
		getMlTag: function (tag: string | Array<string>, cb: any) {
			if (typeof tag === 'string')
				return this.getMlTag_(tag, cb);

			const ret = {};
			let count = 0;

			tag.forEach((t) => {
				this.getMlTag_(t, (err: Error, r: any) => {
					Object.assign(ret, r);

					if (++count === tag.length)
						cb(err, ret);
				});
			});
		},
		getMlTag_: function (tag: string, cb: any) {
			this.find({_tag: tag}, exclude)
				.then((r: any) => {
					const ret: any = {};

					r.forEach((obj: any) => {
						ret[obj._k] = obj.toObject();

						delete ret[obj._k]._k;
					});

					cb(null, ret);
				})
				.catch(cb);
		},
		check: function () {
			const dbname = this.db.name;

			return this.countDocuments()
				.then((count: number) => {
					if (count > 5) return count;

					console.log('Inserting lang collection default values');

					exec('mongorestore -d ' + dbname + ' -c lang ' + site.lipthusDir + '/configs/lang.bson', (err: Error, stdout: string, stderr: string) =>
						console.log(err, stdout, stderr)
					);
				});
		}
	};

	return s;
}
