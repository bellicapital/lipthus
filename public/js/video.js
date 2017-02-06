"use strict";

function EucaVideo(v, o){
	$.extend(this, v);

	if(o)
		this.options = o;

	if(!this.versions && !this.path && !this.data)
		this.buildVersions();
}

(function($, euca){


EucaVideo.prototype.getPoster = function(w){
	if(this.thumb)
		return this.thumb;
	
	if(!this.id)
		return;
	
	var ret = '//' + euca.server + '/videos/' + this.id + '/poster';
	
	if(w)
		ret += w;

	if(this.thumbMD5)
		ret += '_' + this.thumbMD5;
	
	ret += '.jpg';
	
	return ret;
};

EucaVideo.prototype.posterEditor = function($c){
	var self = this;

	function finish(){
		$c.empty().appendVideo(self, self.options);
	}

	$c.html('<a href="#" class="ui-btn ui-icon-arrow-l ui-btn-icon-notext ui-corner-all" style="float:left;margin-top:-10px"></a>'
		+ '<div>Poster</div>'
		+ '<img src="' + this.getPoster(300) + '"/>')
		.find('a')
		.click(finish);

	$('<div style="font-size:.7em;margin-top:10px"><input type="file"/></div>')
		.appendTo($c)
		.find('input')
		.html5Uploader({
			params: {
				schema: 'fsfiles',
				itemid: this.id,
				field: 'thumb'
			},
			onComplete: function(e, b, d){
				self.thumbMD5 = d.md5;

				finish();
			}
		});
};

EucaVideo.prototype.buildVersions = function(){
	this.versions = {
		mp4: '/videos/' + this.id + '.mp4',
		webm: '/videos/' + this.id + '.webm'
	};
};

$.fn.appendVideo = function(v, options){
	var o = $.extend({
		controls: true,
		load: $.noop,
		width: 300
	}, options);

	if(v.constructor.name !== 'EucaVideo')
		v = new EucaVideo(v, o);

	var $video = $('<video/>').width(o.width).on('loadeddata', o.load);
	
	$video.attr('poster', v.getPoster(o.width));

	$video.prop('controls', o.controls);
	
	if(v.versions){
		var versions = {};
		
		$.each(v.versions, function(type){
			var canplay = $video[0].canPlayType('video/' + type);
			
			if(canplay)
				versions[canplay] = {type: type, uri: this};
		});
		
		if(versions.probably)
			versions = [versions.probably];

		$.each(versions, function(){
			$video.append('<source type="video/' + this.type + '" src="//' + euca.server + this.uri + '">');
		});
	} else if(v.path)
		$video.append('<source type="' + v.contentType + '" src="//' + euca.server + v.uri + '">');
	else if(v.data)
		$video.append('<source type="' + v.type + '" src="' + v.data + '">');

	$video.load(function(){
		if(this.networkState === HTMLMediaElement.NETWORK_NO_SOURCE){
			$video.after('<p style="width:'+o.width+'px;height:'+o.height+'px;display:table-cell;border:1px solid;background-color:#ccc">No se puede reproducir el video</p>');
			
			$video.remove();
			
			$video.trigger('error');
		}
	});
	
	this.append($video);

	if(o.dev) {
		var $c = this;

		$video.on('loadedmetadata', function (a,b) {
			v.dom = this;

			$('<div class="dimensions">' + this.videoWidth + ' x ' + this.videoHeight + ' <a href="#">poster</a>' + '</div>')
				.appendTo($c)
				.find('a')
				.click(v.posterEditor.bind(v, $c));
		});
	}

	return this;
};

}(jQuery, euca));