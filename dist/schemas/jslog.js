module.exports = function jslog(Schema) {
    const s = new Schema({
        errorMsg: String,
        url: String,
        lineNumber: Number,
        column: Number,
        context: String,
        submitter: { type: Schema.Types.ObjectId, ref: 'user' }
    }, {
        collection: 'logger.clientjs',
        capped: { size: 4096, max: 100 },
        versionKey: false,
        created: true
    });
    s.statics = {
        logError: function (errorMsg, url, lineNumber, column, context, cb) {
            this.create({
                errorMsg: errorMsg,
                url: url,
                lineNumber: lineNumber,
                column: column,
                context: context
            }, cb);
        }
    };
    return s;
};
