"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const lib_1 = require("../lib");
const mongoose_1 = require("mongoose");
function default_1(req, res, next) {
    let id = req.params.id;
    if (!id)
        return next(new Error('No id param'));
    let ext = req.params.type;
    if (!ext && /^.+\.\w+$/.test(id)) {
        const tmp = id.split('.');
        if (tmp[1].length < 5) {
            id = tmp[0];
            ext = tmp[1];
        }
    }
    const m = id.split('.');
    const dbName = m[1] && m[0] || req.site.db.name;
    if (m[1])
        id = m[1];
    if (!req.site.dbs[dbName] || !mongoose_1.Types.ObjectId.isValid(id))
        return next();
    req.site.dbs[dbName].fs.getVideo(id).load()
        .then((file) => {
        if (!file)
            return next();
        if (file.error)
            throw file.error.status || file.error;
        if (!ext)
            return res.redirect('/videos/' + (dbName !== req.site.db.name ? dbName + '.' : '') + id + '/' + file.filename);
        let opt;
        if (ext.indexOf('poster') === 0) {
            opt = {
                width: file.metadata.width,
                height: file.metadata.height,
                crop: true
            };
            const r = /^poster(\d+)x?(\d*)/.exec(ext);
            if (r) {
                opt.width = parseInt(r[1], 10);
                opt.height = parseInt(r[2], 10) || (file.metadata.height * opt.width / file.width);
            }
            return file.sendThumb(req, res, opt);
        }
        else if (ext === 'tag') {
            const basename = encodeURIComponent(file.basename().toLocaleLowerCase());
            const basePath = req.protocol + '://' + req.headers.host + '/videos/' + dbName + '.' + file._id + '/';
            res.locals = {
                poster: basePath + 'poster.jpg',
                mp4: basePath + basename + '.mp4',
                webm: basePath + basename + '.webm'
            };
            return res.render(req.site.lipthusDir + '/views/video-tag');
        }
        else if (/^f_\d+_/.test(ext)) { // frames
            const parsed = /^f_(\d+)_(\d*)x?(\d*)(k?)/.exec(ext);
            const frame = parseInt(parsed[1], 10);
            if (parsed[2])
                opt = {
                    width: parseInt(parsed[2], 10),
                    height: parseInt(parsed[3], 10),
                    crop: !!parsed[3]
                };
            return file.sendFrame(req, res, frame, opt);
        }
        if (ext.indexOf('.') !== -1)
            ext = path_1.extname(ext).substr(1);
        if (lib_1.GridFSFile.videoExt.indexOf(ext) === -1 // no es una de las admitidas
            || file.folder !== 'videos' // no es un fichero principal de un video
        // || ('video/' + ext === file.contentType && (!file.versions || !file.versions[ext]))	// no existe la versión y la extensión es la del archivo principal
        )
            return file.send(req, res);
        return file.getVideoVersion(ext, req.query.force)
            .then((version) => version.send(req, res))
            .catch((err) => {
            if (err.code === 1) // version processing
                res.set("Retry-After", "120").status(503);
            else
                throw err;
            return res.send(err.message);
        });
    })
        .catch(next);
}
exports.default = default_1;