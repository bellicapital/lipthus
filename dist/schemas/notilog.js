module.exports = function notilog(Schema) {
    return new Schema({
        item: Schema.Types.ObjectId,
        opt: {},
        subscribers: [String]
    }, {
        collection: 'logger.notifications',
        created: true
    });
};
