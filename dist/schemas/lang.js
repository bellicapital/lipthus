"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
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
exports.name = 'lang';
function getSchema(site) {
    const s = new lib_1.LipthusSchema({
        _tag: { type: String, index: true },
        _k: { type: String, index: true, unique: true }
    }, {
        collection: 'lang',
        strict: false,
        id: false
    });
    s.methods = {
        values: function () {
            const ret = this.toObject();
            excludeAll.forEach(n => delete (ret[n]));
            return ret;
        }
    };
    s.statics = {
        get: function (n) {
            return this.findOne({ _k: n });
        },
        getValues: function (n) {
            return this.get(n)
                .then((r) => r && r.values());
        },
        load: function (tag, code) {
            const fields = { _id: false, _k: true };
            fields[code] = true;
            return this.find({ _tag: tag }, fields);
        },
        getMlTag: function (tag, cb) {
            if (typeof tag === 'string')
                return this.getMlTag_(tag, cb);
            const ret = {};
            let count = 0;
            tag.forEach((t) => {
                this.getMlTag_(t, (err, r) => {
                    Object.assign(ret, r);
                    if (++count === tag.length)
                        cb(err, ret);
                });
            });
        },
        getMlTag_: function (tag, cb) {
            this.find({ _tag: tag }, exclude)
                .then((r) => {
                const ret = {};
                r.forEach((obj) => {
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
                .then((count) => {
                if (count > 5)
                    return count;
                console.log('Inserting lang collection default values');
                exec('mongorestore -d ' + dbname + ' -c lang ' + site.lipthusDir + '/configs/lang.bson', (err, stdout, stderr) => console.log(err, stdout, stderr));
            });
        }
    };
    return s;
}
exports.getSchema = getSchema;
