/**
 * Created by jj on 11/10/16.
 */

(function($){

	$.fn.userBox = function(options){
		var o = $.extend({
		}, options);

		var $me = this;
		var picture = euca.user.picture ? euca.user.picture + '&width=24&height=24' : '/cms/img/silhouette.gif';

		var html = '<a href="/users/" + euca.user.uname><img src="' + picture + '" alt="' + euca.user.name + '"/>' + euca.user.name + '</a>';

		$me.html(html);
	};

	$.jsLoaded(function(){
		$('.userbox').userBox();
	});

})(window.jQuery);