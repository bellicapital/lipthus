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
		_tag: {type: String, index: true },
		_k: {type: String, index: true, unique: true}
	}, {
		collection: 'lang',
		strict: false,
		id: false
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
		getMlTag: async function (tag: string | Array<string>) {
			if (typeof tag === 'string')
				return this.getMlTag_(tag);

			const ret = {};

			for (const t of tag) {
				const r = await this.getMlTag_(t);

				Object.assign(ret, r);
			}

			return ret;
		},
		getMlTag_: async function (tag: string) {
			const r: any = await this.find({_tag: tag}, exclude);

			const ret: any = {};

			for (const obj of r) {
				ret[obj._k] = obj.toObject();

				delete ret[obj._k]._k;
			}

			return ret;
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
