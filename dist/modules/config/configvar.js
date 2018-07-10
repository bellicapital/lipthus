"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const merge = require('merge-descriptors');
const { MultilangText } = require('../schema-types/mltext');
class ConfigVar {
    constructor(options, site) {
        this.site = site;
        this.title = '';
        this.name = '';
        this.desc = '';
        // noinspection SpellCheckingInspection
        this.formtype = 'text';
        this._id = options._id;
        merge(this, options);
        this.setValue(this.value);
    }
    /**
     * necesario para que se actualicen las propiedades definidas en config
     * @returns {*}
     */
    getValue() {
        return this.value;
    }
    setValue(v) {
        this.value = v;
    }
    get4Edit(req) {
        return Promise.resolve({
            id: this._id.toString(),
            name: this.name,
            value: this.value,
            formtype: this.formtype,
            caption: req.ml.get(this.title),
            description: req.ml.all[this.desc],
            options: this.options
        });
    }
}
exports.ConfigVar = ConfigVar;
class StringConfigVar extends ConfigVar {
}
class FloatConfigVar extends ConfigVar {
}
class BdfConfigVar extends ConfigVar {
}
class PageConfigVar extends ConfigVar {
}
class ThemesetConfigVar extends ConfigVar {
}
class ObjectConfigVar extends ConfigVar {
    constructor() {
        super(...arguments);
        this.formtype = 'object';
    }
    setValue(v) {
        if (typeof v === 'string')
            v = JSON.parse(v);
        this.value = v;
    }
}
class BoolConfigVar extends ConfigVar {
    constructor() {
        super(...arguments);
        this.formtype = 'boolean';
    }
}
class IntConfigVar extends ConfigVar {
    setValue(v) {
        this.value = parseInt(v, 10);
    }
}
class WatermarkConfigVar extends ConfigVar {
    constructor() {
        super(...arguments);
        this.formtype = 'watermark';
    }
}
class LangConfigVar extends ConfigVar {
    constructor() {
        super(...arguments);
        this.formtype = 'selector';
    }
    setValue(v) {
        this.value = v;
    }
    get4Edit(req) {
        return super.get4Edit(req)
            .then(ret => {
            return req.ml.availableLangNames()
                .then((langNames) => {
                ret.options = langNames;
                return ret;
            });
        });
    }
}
class SelectorConfigVar extends ConfigVar {
    get4Edit(req) {
        return super.get4Edit(req)
            .then(ret => {
            if (!Array.isArray(ret.options))
                return ret;
            return req.ml
                .load(['ecms-config', 'ecms-admin', 'ecms-comment'])
                .then((r) => {
                ret.options.forEach((opt, idx) => {
                    if (r[opt])
                        ret.options[idx] = r[opt];
                });
                return ret;
            });
        });
    }
}
class MultilangConfigVar extends ConfigVar {
    setValue(v) {
        this.value = v && new MultilangText(v, this.site.db.config.collection, 'value', this._id, this.site);
    }
    get4Edit(req) {
        return super.get4Edit(req)
            .then((ret) => {
            ret.multilang = true;
            if (!ret.value || ret.value[0] !== '_')
                return ret;
            return req.ml.load(['ecms-config'])
                .then((r) => {
                if (r[ret.value])
                    ret.value = r[ret.value];
                return ret;
            });
        });
    }
}
exports.MultilangConfigVar = MultilangConfigVar;
exports.ConfigVarInstance = function (options, site) {
    switch (options.datatype) {
        case 'selector':
            return new SelectorConfigVar(options, site);
        case 'multilang':
            return new MultilangConfigVar(options, site);
        case 'string':
            return new StringConfigVar(options, site);
        case 'float':
            return new FloatConfigVar(options, site);
        case 'bdf':
            return new BdfConfigVar(options, site);
        case 'page':
            return new PageConfigVar(options, site);
        case 'themeset':
            return new ThemesetConfigVar(options, site);
        case 'object':
            return new ObjectConfigVar(options, site);
        case 'bool':
            return new BoolConfigVar(options, site);
        case 'int':
            return new IntConfigVar(options, site);
        case 'watermark':
            return new WatermarkConfigVar(options, site);
        case 'lang':
            return new LangConfigVar(options, site);
    }
    // const cl = eval(options.datatype.replace(/^(\w)/, (a: string) => a.toUpperCase()) + 'ConfigVar');
    //
    // return new cl(options, site);
};
