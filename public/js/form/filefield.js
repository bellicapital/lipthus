(function($){

$.fn.camera = function(options){
	if(typeof options === 'function')
		options = {onUploaded: options};

	return this.each(function(){
		var $me = $(this);

		$me.click(function(){
			$.getPicture($.extend({
				limit: 1,
				duration: 3600,
				src: $me.attr('data-role') || 'camera',
				schema: $me.attr('data-schema'),
				itemid: $me.attr('data-itemid'),
				field: $me.attr('data-field'),
				name: $me.attr('data-name'),
				mediaType: $me.attr('accept'),
				onUploaded: $.noop
			}, options));
		});
	});
};

var methods = {
	init: function(options){
		return this.each(function(){
			var o = $.extend({
				quality: 75,
				thumbWidth: 150,
				thumbHeight: 150,
				onSort: $.noop,
				onChange: $.noop,
				onUploaded: $.noop,
				onError: $.noop
			}, options);

			var input = this,
				$input = $(this),
				ds = this.dataset,
				$c = $input.parent();

			var s = {
					schema: o.schema || ds.schema,
					field:  o.field || ds.field,
					itemid: o.itemid || ds.itemid,
					quality: ds.quality || o.quality,
					type: $input.attr('accept') || o.type,
					limit: parseInt(o.limit || ds.limit || 0, 10),
					onChange: $.noop
				};

			if(o.gallery)
				s.gallery = $(o.gallery);
			else {
				s.gallery = ds.gallery;

				if(s.gallery)
					s.gallery = $('#' + s.gallery);
				else
					s.gallery = $('<div style="padding:8px;overflow-x:auto"/>').prependTo($c);
			}

			$input.data('fileField', s);

			if(s.type)
				s.type = /^[^\/]+/.exec(s.type)[0];

			if(!o.values && !o.value){
				if(s.limit === 1){
					o.value = ds.value;
				} else {
					var values = ds.value;

					if(values){
						values = values.split('|');

						o.values = {};

						$.each(values, function(){
							var val = this.match(/^([^:]+):(.+)$/);

							if(val)
								o.values[val[1]] = val[2];
						});

						if(!Object.keys(o.values).length)
							delete o.values;
					}
				}
			}

			if(o.value){
				var thumb;

				if(s.type === 'image'){
					var path = '/bdf/' + s.schema + '/' + s.itemid + '/' + s.field + '/';

					thumb = {
						name: o.value,
						path: path,
						uri: path + o.value
					};
				}
			
				methods.appendThumbs.call($input, thumb);
			} else if(o.values){
				var thumbs = {};

				if(s.type === 'image')
					$.each(o.values, function(key, name){
						var path = '/bdf/' + o.schema + '/' + o.itemid + '/' + o.field + '.' + key + '/';

						thumbs[key] = {
							name: name,
							path: path,
							uri: path + name
						};
					});
				else if(s.type === 'video')
					$.each(o.values, function(key, video){
						video = JSON.parse(video);

						thumbs[key] = {
							id: video.id,
							thumbMD5: video.thumbMD5,
							name: 'video'
						};
					});
				else
					$.each(o.values, function(key, file){
						thumbs[key] = {
							id: file.id || file,
							name: 'file'
						};
					});

				methods.appendThumbs.call($input, thumbs);
			}
			
			$.fn.sortable && s.gallery.sortable().on('sortupdate', function(){
				$input.trigger('sortupdate');
				o.onSort.call(input);
			});

			function findInGallery(file){
				var ret = null;
				var time = file.lastModifiedDate.getTime();

				s.gallery.find('>.thumb-container').each(function(){
					var thumb = $(this).data('thumb'),
						mod = thumb.lastModifiedDate;

					if(typeof mod === 'string')
						mod = new Date(mod);

					if(thumb.name === file.name && thumb.size === file.size && mod.getTime() === time){
						ret = this;

						return false;
					}
				});

				return ret;
			}

			function onSelect(e, file){
				//phonegap
				if(navigator.app){
					methods.appendUploading.call($input, file);

					if(s.limit){
						var $children = s.gallery.children('.thumb-container');

						if($children.size() > s.limit)
							$children.slice(0, $children.size() - s.limit).remove();
					}

					return;
				}

				//HTML5 uploader
				var reader = new FileReader();

				reader.onload = (function(theFile) {
				  return function(e) {

					methods.appendUploading.call($input, $.extend({data: e.target.result}, theFile));

					if(s.limit){
						var $children = s.gallery.children('.thumb-container');

						if($children.size() > s.limit)
							$children.slice(0, $children.size() - s.limit).remove();
					}
				  };
				})(file);

				return reader.readAsDataURL(file);
			}

			function onProgress(e, file){
				$(findInGallery(file)).innerProgressBar(Math.floor(e.loaded * 100 / e.total));
			}
			
			function onError(e, file){
				$.alert('Error uploading file');
				file && $(findInGallery(file)).remove();
				return o.onError.call($input, e);
			}

			function onUploaded(e, file, r){
				if(r.error)
					return onError(r.error);
				
				var $thumb = $(findInGallery(file)).innerProgressBar(100);

				$thumb.next('.innerProgressBar').fadeOut(function(){
					$(this).remove();
					$thumb.remove();
				});

				if(r.error){
					console.warn(r);

					return o.onError.call($input, r.error);
				}

				if(s.limit !== 1) {
					var tmp = {};

					tmp[r.key] = r;

					r = tmp;
				}

				methods.appendThumbs.call($input, r);

				o.onUploaded.call($input, r);
			}

			if(this.tagName === 'INPUT' && navigator.camera){
				$input.parent().hide();

				s.onChange = onSelect;
				s.onUploaded = onUploaded;
				s.onProgress = onProgress;

				function genButton(label, src){
					$('<a href="#" data-inline="true">' + label + '</a>')
						.appendTo($c)
						.button()
						.click(function(){
							$(this).blur();
							s.src = src;
							$.getPicture(s);
						});
				}

				var eo = $.mobile.eucaoptions;

				if($input.attr('data-capture'))
					genButton(o.captureLabel || $input.attr('data-captureLabel') || eo[s.type + 'CaptureLabel'], 'camera');

				if(!$input.attr('data-only-capture'))
					genButton(o.uploadLabel || $input.attr('data-uploadLabel') || eo[s.type + 'UploadLabel'], 'gallery');

			} else {
				$input.html5Uploader({
					params: {
						schema: s.schema,
						itemid: s.itemid,
						field: s.field
					},
					onClientLoad: onSelect,
					onServerProgress: onProgress,
					onComplete: onUploaded
				});
			}
		});
	},
	appendThumbs: function(thumbs){
		if(thumbs.name)
			thumbs = [thumbs];

		if(typeof thumbs !== 'object')
			return this;

		return this.each(function(){
			var self = this,
				s = $(this).data('fileField'),
				thereareimg;

			$.each(thumbs, function(i,thumb){
				var $d = $('<div class="thumb-container"/>').appendTo(s.gallery).data('thumb', thumb),
					field = s.field;

				if(i)
					field += '.' + i;

				if(!self.disabled)
					$('<a href="#" class="form-thumb-delete ui-btn ui-icon-delete ui-corner-all ui-btn-icon-notext ui-btn-inline" data-field="' + field + '" title="Eliminar ' + thumb.name + '?"></a>')
						.appendTo($d).data('input', self);

				if(s.type === 'image'){
					thereareimg = true;

					if(thumb.constructor.name !== 'EucaImage'){
						thumb = new EucaImage(thumb);
						thumbs[i] = thumb;
					}

					var $a = $('<a class="photoswipe" href="' + thumb.src() + '"></a>').appendTo($d);
					var img = new Image();

					$(img).load(function(){
						// para los svg que no se redimensionan
						img.width = Math.min(img.naturalWidth, 150);
						$a.append(img);
					});

					img.src = thumb.src(150, 150);

					//Dimensiones naturales
					var imgNat = new Image();
					
					$(imgNat).load(function(){
						$d.append('<div class="dimensions">' + imgNat.naturalWidth + ' x ' + imgNat.naturalHeight + '</div>');
					});

					imgNat.src = thumb.uri;
				} else if(s.type === 'video'){
					setTimeout($d.appendVideo.bind($d, thumb, {dev: true}), 1);
				} else {//ficheros no multimedia
					var fileSrc = '//' + euca.server;
					var src = '//' + euca.server;

					if(/^[a-f0-9]{24}$/.test(thumb.id)){
						fileSrc += '/fs/' + thumb.id;
						src += '/thumbs/' + thumb.id + '_150_150_0.png';
					} else {
						fileSrc += '/bdf/' + s.schema + '/' + s.itemid + '/' + s.field + '.' + i + '/' + thumb.id;
						src += '/bdf/' + s.schema + '/' + s.itemid + '/' + s.field + '.' + i + '/150x150k0.png';
					}

					$d.append('<a href="' + fileSrc + '"><img src="' + src + '" style="max-width:150px;max-height:150px;"/></a>');
				}
			});

			if(!thereareimg)
				return;

			var $a = s.gallery.find('a.photoswipe');

			if($.fn.photoSwipe)
				$a.photoSwipe();
			else
				$a.click(function(e){
					e.stopPropagation();
					e.preventDefault();

					$('<img src="' + this.href + '" style="position:fixed;top:0;left:0;display:none;z-index:99"/>').appendTo('body').load(function(){
						var $modal = $('<div style="width:100%;height:100%;position:absolute;top:0;left:0;background-color:#fff;opacity:.8"/>')
								.appendTo('body');

						if(window.innerHeight > this.naturalHeight)
							this.style.top = (window.innerHeight - this.naturalHeight) / 2 + 'px';

						if(window.innerWidth > this.naturalWidth)
							this.style.left = (window.innerWidth - this.naturalWidth) / 2 + 'px';

						this.style.display = 'block';

						var img = this;

						$(document).one('click', function(){
							$(img).remove();
							$modal.remove();
						});
					});
				});
		});
	},
	appendUploading: function(file){
		var self = this;

		return this.each(function(){
			var s = $(this).data('fileField');

			var $d = $('<div class="thumb-container" style="width:200px;height:50px">Subiendo archivo...</div>').appendTo(s.gallery).data('thumb', file),
				field = s.field;

			$('<a href="#" class="form-thumb-delete ui-btn ui-icon-delete ui-corner-all ui-btn-icon-notext ui-btn-inline" data-field="' + field + '" title="Eliminar ' + file.name + '"></a>')
				.appendTo($d).hide().data('input', self);

			$d.innerProgressBar();
		});
	}
};

$.fn.fileField = function(a, b, c){
	if(typeof a === 'string')
		return methods[a].call(this, b, c);
	else
		return methods.init.call(this, a);
};

$.contentReady(function(){
	$.mobile = $.mobile || {};
	$.mobile.eucaoptions = $.mobile.eucaoptions || {};

	var eo = $.mobile.eucaoptions;

	eo.imageCaptureLabel = 'Capturar foto';
	eo.imageUploadLabel = 'Subir foto';
	eo.videoCaptureLabel = 'Capturar video';
	eo.videoUploadLabel = 'Subir video';
	
	$('[data-role="gallery"],[data-role="camera"]').camera();
	$('[type="input"]').fileField();
});


})(jQuery);