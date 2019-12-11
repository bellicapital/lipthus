"use strict";
module.exports = {
    groupConfigs(req) {
        const ret = {};
        const groupName = req.body.key;
        return req.ml
            .load(['ecms-config', 'ecms-comment', 'ecms-user', 'ecms-misc', 'ecms-shopping'])
            .then(() => req.site.config.getConfigsByCat(groupName))
            .then(configs => Object.keys(configs).reduce((p, name) => p.then(() => configs[name].get4Edit(req)
            .then(r => {
            ret[name] = r;
            delete r.name;
        })), Promise.resolve()))
            .then(() => ({
            group_name: groupName,
            configs: ret
        }));
    }
};
