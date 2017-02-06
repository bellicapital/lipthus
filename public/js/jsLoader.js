"use strict";

var $$ = {};

(function(){

	$$.loadJsFile = function(src, c){
		var s = document.createElement("script");
		s.src = src;

		c && onLoad(s, c);

		document.head.appendChild(s);
	};

	$$.loadCssFile = function(src, c) {
		var s = loadCSS(src);
		c && onLoad(s, c);
	};

	var i, jsLoaded = {}, cssLoaded = {};

	var _info = window.console && console.info ? function () {console.info.apply(console, arguments);} : function(){};

	function onLoad(ele, cb){
		if(ele.addEventListener)
			ele.addEventListener('load', cb, false);
		else if (ele.attachEvent)
			ele.attachEvent("onload", cb);
		else
			ele["onload"] = cb;
	}

	function loadJS(a, cb, cache){
		if(!(a instanceof Array))
			a = [a];

		i = -1;

		(function c(){
			i++;

			if(!a[i]){//Se han cargado todos
				cb && cb();
				return;
			}

			if(!a[i].src){
				a[i] = {
					src: a[i],
					m: cache === false ? $.now() : false
				};
			}

			var src = a[i].src;

			if(jsLoaded[src]){
				c();
				return;
			}

			jsLoaded[src] = true;

			if(/^\/\w+/.test(src))
				src = euca.staticUrl + src;

			if(a[i].m)
				src += '?_=' + a[i].m;

			$$.loadJsFile(src, !a[i].async ? c : null);

			a[i].async && c();
		})();
	}

	function _loadCSS(a, cb){
		if(!a.length)
			return cb();

		var count = 0;

		a.forEach(function(css){
			if(!css.src){
				css = {
					src: css
				};
			}

			var src = css.src;

			if(cssLoaded[src])
				return;

			cssLoaded[src] = true;

			if(/^\/\w+/.test(src))
				src = euca.staticUrl + src;

			if(css.m)
				src += '?_=' + css.m;

			$$.loadCssFile(src, function(){
				if(++count === a.length)
					cb();
			});
		});
	}

	var loadEucaJSCSS = function(){
		euca.css.length && _loadCSS(euca.css, function(){
			console.debug('eucaCSS loaded');
		});

		loadJS(euca.js, function(){
			if(window.jQuery){
				euca.combinedJS && jQuery.each(euca.combinedJS, function(){
					jsLoaded[euca.staticUrl + this] = true;
				});
				jQuery.info = _info;
				jQuery.loadJS = loadJS;
				jQuery(window).trigger("jsloaded");
			}
		});
	};

	onLoad(window, loadEucaJSCSS);

})();