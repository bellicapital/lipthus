"use strict";

(function($){

	var queue = [];

	var methods = {
		load: function(options){
			var cb;//callback

			if(typeof(options) === 'function'){
				cb = options;
			} else {
				options = options || {};
				cb = options.onLoad || $.noop;
			}

			if(!$('#fb-root').size())
				$('body').prepend('<div id="fb-root"></div>');


			if($.fbInternals.inited)
				return cb();

			if($.fbInternals.loading)
				return queue.push(cb);

			$.fbInternals.loading = true;

			window.fbAsyncInit = function(r){
				//Subscribe events
				FB.Event.subscribe('xfbml.render', function(r){
					if(!$.fbInternals.toParse.length){
						$.fbInternals.parsing = false;
						return;
					}

					var next = $.fbInternals.toParse[0];

					$.fbInternals.toParse.splice(0,1);

					$.fbInternals.parsing = true;

					FB.XFBML.parse(next.ele, next.cb);
				});

//				FB.Event.subscribe('auth.login', function(r){l('auth.login')
//					$.fbInternals.statusChange(r);
//				});

				FB.Event.subscribe('auth.logout', function(r){
					$.fbInternals.statusChange(r);
				});

//				FB.Event.subscribe('auth.authResponseChange', function(r){l('auth.authResponseChange',r);});

				FB.Event.subscribe('auth.statusChange', function(r){//l('auth.statusChange')
					$.fbInternals.statusChange(r);
				});

				FB.init({
					version		: "v2.6",
					appId		: euca.fb && euca.fb.appId,
					channelURL	: '//' + window.location.host + '/cms/fb_channel_file.html',
					status		: !!euca.user && !!euca.fb,
					cookie		: true,
					oauth		: true,
					xfbml		: false
				});

				$.fbInternals.inited = true;

				$('body').fbParse();

				$.each(queue, function(){
					this();
				});

				queue = [];
			};

			// (proxy)
			$.ajax({
				url: euca.staticUrl + '/pc/fb-' + euca.locale + '.js',//"https://connect.facebook.net/" + euca.locale + "/all.js",
				dataType: "script",
				cache: true
			});
		},
		login: function(options){
			var o = $.extend({
				scope: 'email',
				success: $.noop
			}, options);

			if(!euca.fb.appId)
				return console.warn('Facebook login not available. No appId');

			$.fb('load', function(){
				function doLogin(){
					FB.login(function(r){
						if($.fbInternals.statusChange(r))
							o.success(r);
					}, {scope: o.scope});
				}

				FB.getLoginStatus(function(r){
					if(r.status === 'connected' && o.scope){
						FB.api('/me/permissions', function(p){
							var ok = true;
							$.each(o.scope.split(','), function(){
								if(p.data[0][this] !== 1){
									ok = false;
									return false;
								}
								return true;
							});
							if(ok){
								r.permissions = p.data[0];
								o.success(r);
							} else
								doLogin();
						});
					} else
						doLogin();
				});
			});
		},
	/**
	 * FB.logout will log the user out of both your site and Facebook
	 * @link https://developers.facebook.com/docs/reference/javascript/FB.logout/
	 * @param {*} c {} or callback function
	 */
		logout: function(c){
			c = c || $.noop;

			if(!euca.fb.appId){
				c();
				return;
			}

			$.fb('load', function(){
				FB.getLoginStatus(function(r){
					if(r.status !== "connected")
						c();
					else FB.logout(function(r){
						if(r.status !== "connected")
							c();
					});
				});
			});
		}
	};

	$.fb = function(method){
		if(methods[method]){
			return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method || typeof method === 'function') {
			return methods.load.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.fb' );
			return this;
		}
	};

	$.fbUser = {
		uid			: null,
		connected	: false
	};

	$.fbInternals = {
		parsing		: false,
		toParse		: [],
		statusChange: function(r){
			var uid = r.authResponse && parseInt(r.authResponse.userID);
			var connected = r.status === 'connected';

			// evita ejecutar el código múltiples veces por distintos subscribes
			if($.fbUser.uid === uid && $.fbUser.connected === connected)
				return true;

			$.fbUser.uid = uid;
			$.fbUser.connected = connected;

			$(window).trigger($.fbUser.connected ? 'onFbLogin' : 'onFbLogout', [$.fbUser.uid]);
			$(window).trigger('onFbStatusChange', [$.fbUser.uid, r.status]);

			return true;
		}
	};

	$.fn.fbParse = function(options){
		if($.isFunction(options))
			options = {onComplete: options};

		var o = $.extend({
			onComplete: $.noop,
			returnFbLMS: true,
			tag: null,
			force: false
		}, options);

		var $lms = this.findFbNS(o.tag, ':not([fb-xfbml-state])');

		$.fb(function(){
			$lms.each(function(){
				var $ele = $(this);

				if(!o.force && $ele.attr('fb-xfbml-state'))
					return;

				$ele.attr('fb-xfbml-state', 'toparse');

				var parent = $ele.parent()[0];

				if(!$.fbInternals.parsing){
					FB.XFBML.parse(parent, o.onComplete);
					return;
				}

				$.fbInternals.toParse.push({ele: parent, force: o.force, cb: o.onComplete});
			});
		});

		return o.returnFbLMS ? $lms : this;
	};

	/**
	 * Appends a fb tag and parses it.
	 * @param tag string
	 * @param options object
	 */
	$.fn.fb = function(tag, options){
		if(tag === 'parse')
			return this.fbParse(options);

		var tags = {
			'login-button': {
				'show-faces': 'false',
				'width': 73,
				'max-rows': 1,
//				'registration-url': null,
//				'size': 'medium',//small, medium, large, xlarge
				'scope': 'email'
			},
		/**
		 * @link https://developers.facebook.com/docs/reference/plugins/like/
		 */
			like: {
				href: location.href,
				send: false,	//specifies whether to include a Send button @link http://developers.facebook.com/docs/reference/plugins/send/
				layout: 'button_count', //standard, button_count, box_count
				'show-faces': false,
				'share': false,
				width: 450,
				action: 'like', // like, recommend
//				ref: null,		//a label for tracking referrals
				font: 'arial'	//arial, lucida grande, segoe ui, tahoma, trebuchet ms, verdana
			},
			'like-box': {
				href: null,
				'show-faces': true,
				width: 292,
				height: null,
				stream: false,
				header: false,
				'border-color': null,
				'force-wall': true
			},
			comments: {
				href: null,
				width: 400,
				//mobile: 'auto-detect',
				num_posts: 10 // the number of comments to show by default. Minimum: 1
			}
		};

		if(!tags[tag]){
			$.error('Facebook tag "' + tag + ' not implemented');
			return this;
		}

		var o = $.extend({
//			colorscheme: 'light', // light, dark
		}, tags[tag], options);

		var $ret = $();

		this.each(function(){
			// para no parsear mas veces, obligamos a estar vacío
			if($(this).findFbNS(tag, '>*').size())
				return;

			var attr = '';

			$.each(o, function(k,v){
				attr += ' ' + k + '="' + v + '"';
			});

			//noinspection CheckTagEmptyBody
			$ret = $ret.add($('<fb:' + tag + attr + '></fb:' + tag + '>').appendTo(this));
		});

		return this.fbParse({tag: tag});
	};

	/**
	 * Finds all elements with the 'fb' namespace
	 * @param tag To filter specific Facebook tags
	 * @param selector string
	 */
	$.fn.findFbNS = function(tag, selector){
		selector = selector || '*';

		var restr = '^Fb:';

		if(tag)
			restr += tag + '$';

		var $ret = $(), re = new RegExp(restr, 'i');

		this.find(selector).each(function(){
			if(re.test(this.tagName))
				$ret = $ret.add(this);
		});

		return $ret;
	};

	$(function(){
		$.fb();
	});

})(jQuery);