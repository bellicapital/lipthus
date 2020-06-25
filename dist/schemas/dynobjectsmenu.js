module.exports = function dynobjectsmenu(Schema) {
    return new Schema({
        title: { type: Schema.Types.Multilang, caption: '_TITLE', required: true },
        colname: String,
        user_side: Boolean,
        show_orphans: Boolean,
        template: { type: String, "default": 'standard' },
        filter: { type: [], required: true, caption: 'Filtrar' },
        url: { type: String, formtype: 'url', caption: 'Url' }
    }, { collection: 'dynobjectsmenu' });
};
