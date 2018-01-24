"use strict";

module.exports = function notification(Schema){
	const s = new Schema({
		tag: String,
		subject: String,
		content: String,
		url: String,
		uid: {type: Schema.Types.ObjectId, ref: 'user'},
		from: {type: Schema.Types.ObjectId, ref: 'user'},
		seen: Boolean,
		read: Boolean,
		extra: {}
	}, {
		collection: 'notifications',
		created: true
	});

	s.statics = {
		user: function(user){
			return this.find({uid: user})
				.select('-uid')
				.sort({created: -1});
		},
		userTotalCount: function(user){
			return this.count({uid: user});
		},
		userUnread: function(user){
			return this.count({uid: user, read: {$ne: true}});
		},
		userUnseen: function(user){
			return this.count({uid: user, seen: {$ne: true}});
		},
		resetUserNoti : function(user) {
			return this.update({uid: user, seen: {$ne: true}}, {$set: {seen: true}}, {multi: true});
		}
	};

	return s;
};
