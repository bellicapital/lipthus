"use strict";

function Blogger(req){
	if(!(this instanceof Blogger))
		return new Blogger(req);

	this.keys = req.db.dynobject.taggedKeys('blog');
	this.size = this.keys.length;
	this.lang = req.ml.lang;
	
	Object.defineProperty(this, 'req', {get: () => req});
}

Blogger.prototype.getBlogs = function(query, cb){
	if('function' === typeof query){
		cb = query;
		query = {active: true};
	}

	const req = this.req;
	const blogs = [];

	let count = 0;

	this.keys.forEach(k => {
		count++;

		req.site.db[k].count(query, (err, r) => {
			if(err) return cb(err);

			const blog = this.getBlog(k).set('items', r);
			
			blogs.push(blog);
			
			Object.defineProperty(this, k, {get: () => blog});

			if(!--count)
				cb(null, blogs);
		});
	});
};

Blogger.prototype.getBlog = function(k){
	if(this[k])
		return this[k];
	
	if(!this.req.db.schemas[k])
		return;
	
	return new Blog(this.req, k);
};

Blogger.prototype.summary = function(options, cb){
	const ret = [];

	options.lang = this.lang;

	let count = 0;
	
	this.getBlogs((err, blogs) => {
		if(err || !blogs) return cb(err, blogs);
		
		blogs.forEach(blog => {
			blog.summary(options, (err, summary) => {
				ret.push(summary);
				
				if(++count === blogs.length)
					cb(err, ret);
			});
		});
	});
};

Blogger.prototype.getPosts = function(blog, options){
	return this.getBlog(blog).getPosts(options);
};

module.exports = Blogger;

function Blog(req, k){
	this.title = req.db.schemas[k].get('title')[req.ml.lang];
	this.schema = k;
	Object.defineProperty(this, 'req', {get: () => req});
	Object.defineProperty(this, 'collection', {get: () => req.db[k]});
}

Blog.prototype.set = function(k, v){
	this[k] = v;
	return this;
};

Blog.prototype.getPosts = function(options){
	const o = {
		width: options.width || 180,
		height: options.height || 180,
		crop: options.crop !== undefined ? options.crop : true,
		max: options.descmaxlength || 200,
		ellipsis: options.ellipsis || '...',
		stripTags: options.stripTags === undefined ? true : options.stripTags
	};

	const query = {active: true};
	const queryOpt = {sort: {published: -1}};
	const collection = this.collection;
	
	if(options.skip)
		queryOpt.skip=options.skip;
	if(options.limit)
		queryOpt.limit=options.limit;

	//	numero de comentarios para listado de posts
	return collection.findAndGetValuesWithCommentCount(this.req, query, null, queryOpt)
		.then(r => {
			if(!r)
				return;

			r.forEach(post => {
				if(post.description && post.description.length > o.max)
					post.description = post.description.truncate(o.max, {ellipsis: o.ellipsis, stripTags: o.stripTags});

				const src = post.thumb ? 'thumb' : post.image ? 'image' : post.video ? 'video' : null;

				if(src)
					post.thumb = post[src][0].getThumb(o.width, o.height, o.crop);

				if(!post.url)
					post.url = post.id;
			});

			return collection.count(query)
				.then(count => ({posts: r, total: count}));
		});
};

Blog.prototype.summary = function(options){
	const ret = {
		title: this.title,
		items: this.items,
		schema: this.schema
	};
	
	if(!this.items)
		return cb(null, ret);
	
	return this.collection
		.find({active: true})
		.select({title: 1, image: 1})
		.sort({created: -1})
		.limit(options.num)
		.then(posts => {
			if(!posts || !posts.length) return ret;

			ret.posts = [];

			posts.forEach(post => {
				ret.posts.push({
					title: post.title[options.lang],
					created: post.created
				});
			});

			ret.image = posts[0].image;

			if(!ret.image && posts[1])
				ret.image = posts[1].image;

			if(ret.image){
				const width = options.width || 100;
				const height = options.height || 100;
				const crop = options.crop === undefined ? true : options.crop;

				ret.image = ret.image[Object.keys(ret.image)[0]].info(width, height, crop);
			}

			cb(null, ret);
		})
		.catch(() => ret);
};