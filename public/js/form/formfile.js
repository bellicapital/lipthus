/* global euca */

(function($){
/**
 * @todo limit by option multi
 * @param {object} options
 * @returns {$.fn}
 */
$.fn.formFile = function(options){
	if (!window.FormData){
		alert('Bad browser!!!');//TODO: hacer que functione sin prestaciones
		return this;
	}

	return this.each(function(){
		var $me = $(this).addClass('fileField'),
			o = $.extend({
				curlang: euca._LANGCODE,
				fromUrl: false,
				videoRecord: false,
				videoRecordLabel: 'Graba tu video',
				name: 'files',
				change: function(r, c){
					c(true, r.val || r);
				},
				sizeLimit: euca.maxSize,
				multi: 0, // 0=>Unlimited
				forceGridFS: false,
				params: {}
			}, options),
			formFileData = {options: o},
			$queue = $('<div class="uploadifyQueue"></div>').appendTo(this),
			$field = $('<input type="file" size="1"/>').appendTo(this);

		//Old compat
		if(options.onChange)
			o.change = options.onChange;

		$me.data('formFile', formFileData);

		if(o.multi !== 1){
			$field.attr('multiple', 'multiple');
			if(o.multi > 1)
				$field.attr('max', o.multi);
		}

		var defUploadLabel = $.lang('_UPLOAD');

		switch(o.type){
			case 'image':
				o.fromUrl = false;
				o.videoRecord = false;

				defUploadLabel = $.lang('_UPLOAD_IMAGE');

				if(!o.accept)
					o.accept = "image/*";

				break;

			case 'video':
				defUploadLabel = $.lang('_UPLOAD_VIDEO');

				if(!o.accept)
					o.accept = "video/*";

				o.forceGridFS = true;
				break;

			case 'audio':
				if(!o.accept)
					o.accept = "audio/*";
		}

		if(!o.uploadLabel)
			o.uploadLabel = defUploadLabel;

		if(o.accept)
			$field.attr('accept', o.accept);

		if($.isArray(o.value))
			$.each(o.value, function(k){$.isPlainObject(this) && insertVal(this, 'ready', k);});

		$.fn.sortable && $queue.sortable({
			update: function(){
				var keynames = [];
				$(this).find('.uploadifyQueueItem').each(function(){
					if($(this).data('status') === 'ready')
						keynames.push($(this).data('keyname'));
				});
				o.change.call($me, {event: 'sortFiles', val: keynames});
			}
		});

		// Uploadify
		$me.data('formelename', o.name);

		$field.html5Uploader({
			name: o.name,
			params: {
				forceGridFS: o.forceGridFS,
				folder: o.folder,
				schema: o.colname,
				itemid: o.id,
				field: o.name,
				fileType: o.type,
				multi: o.multi
			},
			sizeLimit: o.sizeLimit,
			//onOpen: function(e, ID, fileObj){},
			onSelect: function(file, req){
				if(!o.multi){
					//TODO: revisar. Peta!!!
					// $("#" + id + 'Queue .uploadifyQueueItem').remove();
					//$(this).hide();
					//$flash.hide();
				}

				var $box = insertVal(file, 'uploading').inWindow(20);

				$box.find('.ui-icon-trash')
					.click(function(){
						$(this).blur();
						if($('#' + o.name + file.id).data('status') === 'uploading')
							req.abort();
					});
				$box.find('div.ui-panel-content-text').append('<div class="processing"></div>\
					<div class="uploadifyProgress"><div class="uploadifyProgressBar"></div></div>');

				file.box = $box;

				$me.trigger("onSelect", [file]);
			},
			onClientLoad: function(e, file){
				//Si es imagen muestra el thumb local
				if (file.type.match('image.*'))
					file.box.find('.thumb').append('<img src="' + e.target.result + '" style="max-width: 150px; max-height: 150px"/>');
			},
			onComplete: function(e, file, response){
				var respObj;

				try{
					if(!response) throw 0;
					response = unescape(response);
					respObj = eval('('+response+')');
					if(respObj.error && respObj.error.length) throw 2;
					if(!respObj.size) throw 1;
				} catch(e){
					var er = '';

					if(e===0)
						er = 'No hay respuesta del servidor';
					else if(e===1)
						er = 'Respuesta inválida ' + response;
					else if(e===2)
						er = 'Error: ' + (respObj.error.join ? respObj.error.join(', ') : respObj.error);
					else
						er = response;

					alert('uploading file error: ' + er);

					return;
				}
				file.box.find('.thumb').empty();
				file.box.data('status', 'ready').data('fileObj', respObj);
				file.box.find('.uploadifyProgress').fadeOut(1000);
				file.box.find('.processing').empty();

				o.change.call($me, {event: 'newFile', val: respObj}, function(r, newVal){
					if(!r) return;

					file.box.fileBox('update', newVal)
						.append('<input type="hidden" name="' + o.name + '[' + (newVal.keyname || newVal.id) + ']" value="' + parseInt(file.lastModifiedDate/1000) + '"/>');
				});
			},
			onClientProgress: function(e, file){
				onProgress(e, file, 'Leyendo el archivo... ');
			},
			onServerProgress: function(e, file){
				onProgress(e, file, 'Subiendo... ');
			},
			onError: function(e, file){
				file.box
					.data('status', 'error')
					.data('fileObj', file)
					.addClass('ui-state-error');

				var error;

				if(e.type === 'File Size')
					error = 'Error: El tama&ntilde;o del fichero (' + $.humanizeSize(file.size) + ')'
							+' es mayor que el máximo permitido (' + $.humanizeSize(o.sizeLimit) + ')';
				else
					error = " - Error" + e.type;

				file.box.find(".processing").text(error).removeClass('processing');//evita sobreescribirse por onProgress

			}
		});

		function onProgress(e, file, text){
			var percentage = parseInt(e.loaded*100/e.total, 10);
			file.box.find('.processing').text(text + $.humanizeSize(e.loaded) + ' (' + percentage + '%)');
			file.box.find('.uploadifyProgressBar').css('width', percentage + '%');
		}

		function insertVal(val, status, keyname){
			if(status === undefined)
				status = 'ready';

			var collapsed = !!$queue.children().size() && keyname;

			var $box = $('<div></div>').appendTo($queue).fileBox(val, o.change, collapsed).data('status', status).bind('delete', function(){
				if($(this).data('status') === 'ready'){
					o.change.call($me, {event: 'deleteFile', val: $(this).data('keyname')}, function(r){
						r && $box.slideUp(function(){
							$box.panel('destroy').remove();
						});
					});
				}
			});

			if($box.data('status') === 'ready'){
				$box.append('<input type="hidden" name="' + o.name + '[' + keyname + ']" value="' + val.name + '"/>');
				$box.data('keyname', keyname);
			}

			return $box;
		}

		// From url
		if(o.fromUrl)
			$('<a class="UploaderButton" href="javascript:;">Desde url</a>').appendTo(this).click(function(){
				$.prompt({
					message: 'Url del archivo:',
					complete: function(uri){
						if(!uri)
							return;
						$.ajax({
							data: {handler: 'eucavideo', op: 'fromUri', uri: uri},
							type: 'post',
							success: function(val){
								insertVal(val);
								o.change.call($me, $me.uplVal());
							}
						});
					}
				});
			}).wrap('<div></div>');
	});
};

$.fn.fileBox = function(a, b, c){
	var $me = this, formOptions = this.parents('.fileField').data('formFile').options;
	if(typeof(a) !== 'string'){
		this.addClass('uploadifyQueueItem');
		this.append('<h3></h3>\
			<div>\
				<div class="fileDetails">\
					<div><span class="upFileSize">&nbsp;</span></div>\
					<div class="upFileDate"></div>\
					<div class="upFileDesc"></div>\
				</div>\
				<div class="thumb"></div>\
				<div style="clear: both;"></div>\
			</div>').panel({
				collapsible: true,
				collapsed: c,
				controls: '<span class="ui-icon ui-icon-trash" title="' + $.lang('_DELETE') + '"></span>'
			}).find('.ui-icon-trash').click(function(){
				$me.trigger('delete');
			});
		update.call(this, a);
	} else {
		switch(a){
			case 'update':
				update.call(this, b.value || b);
				this.data('keyname', b.keyname || b.id);
				break;
		}
	}

	function update(file){
		$me.data('fileObj', file);
		var fileName = file.name;

		if(fileName.length > 30)
			fileName = fileName.substr(0,30) + '...';

		var d = file.mtime || file.lastModifiedDate;
		
		if(d && typeof d === 'string')
			d = new Date(d);
		
		var dateStr = d.getDate() + '/' + d.getMonth() + '/' + d.getFullYear() + ' ' + d.getHours() + ':' + ('0'+d.getMinutes()).substr(0,2);
		
		$me.find('.ui-panel-title-text').text(fileName);
		$me.find('.upFileSize').html(file.size ? $.humanizeSize(file.size) : '&nbsp;');
		$me.find('.upFileDate').text(dateStr);

		var $controls = $me.find('.ui-panel-controls');

		if(file.uri && !$controls.find('.ui-icon-arrowreturnthick-1-e').size())
			$controls.prepend('<a class="ui-icon ui-icon-arrowreturnthick-1-e" target="_blank"></a> <a class="ui-icon ui-icon-disk"></a>');

		$controls.find('.ui-icon-arrowreturnthick-1-e').attr('href', file.uri);
		$controls.find('.disk').attr('href', file.uri + '?dl');

		file.description = file.description || {};


		// File description
		$me.find('.upFileDesc').empty();

		if(file.id || file.key){
			$me.find('.upFileDesc').iText({
				editLabel: $.lang('_EDIT'),
				addLabel: $.lang('_ADD_DESCRIPTION'),
				emptyLabel: '<i>(' + $.lang('_DESCRIPTION') + ')',
				formtype: 'textarea',
				rte: true,
				modal: true,
				value: file.description[formOptions.curlang] || '',
				onChange: function(v,c){
					formOptions.onChange({event: 'setDescription', val: {key: formOptions.type === 'video' ? file.id : file.key, lang: formOptions.curlang, text: v}}, function(r){
						r && c(v);
					});
				}
			});
		}

		// Metadata
		if(file.width){//es imagen o video
			$me.find(".upFileDate").after('<div class="dimensions">' + file.width+'x'+file.height + '</div>');
			if(file.duration){//es video
				if(euca.user.isAdmin !== 0) { //Si es administrador muestro información del video
					$me.find(".dimensions")
						.append(', ' + file.fps + 'fps')
						.append('<div>'
							+ $.humanizeDuration(parseFloat(file.duration)) + '<br/>'
							+ 'Audio: ' + file.audioChannels + 'ch.</div>'
					);
				}
			}
		} else if(file.contentType && file.contentType.substr(0, 5) === 'audio'){
			$me.find('.ui-panel-content-text').append('<audio controls><source src="' + file.uri + ' type="' + file.contentType + '"></source></audio>');
		}

		// Thumbnail
		// Si es imagen, no hay thumbnail. Tomamos la propia imagen
		if(file.contentType && file.contentType.substr(0, 5) === 'image'){
			file.thumb = {
				url: file.uri,
				md5: file.md5
			};
		}
		if(file.thumb){
			var t = file.thumb;
			
			if(typeof t === 'string')
				t = {url: t};
			
//			if(t.md5)
//				t.url += '?nwm=' + t.md5;

			var thumbOpt = {
				src: t.url,
				thumbMaxWidth: 120,
				thumbMaxHeight: 100,
				imgWidth: t.width,
				imgHeight: t.height,
				expose: {color: '#FFF'},
				returnThumb: true
			};

			if(file.width){//es imagen o video
				$.extend(thumbOpt, {
					fileObj: file,
					imgWidth: file.width,
					imgHeight: file.height
				});
			}

			$me.find('.thumb').appendThumb(thumbOpt);
		}
	}
	return this;
};

$.fn.formSimpleImage = function(options){
	var $me = this,
		$img = $('<span style="float:left"></span>').appendTo(this),
		o = $.extend({
			value: {},
			onChange: function(r,c){c(true);}
		}, options);


	$('<div style="margin-left: 6px; float:left;">\n\
			<a href="#" title="' + $.lang('_EDIT') + '" style="cursor:pointer">\n\
				<span class="ui-icon ui-icon-pencil"></span>\n\
			</a>\n\
			<a href="#" title="' + $.lang('_DELETE') + '" style="display:none">\n\
				<span class="ui-icon ui-icon-trash"></span>\n\
			</a>\n\
		</div>')
		.appendTo(this).find('a:first').upload({
			action: 'upload',
			params: {
				iframe: true
			},
			onComplete: function(r){
				r = $.parseJSON(r);

				o.onChange(r, function(ok, val){
					if(ok){
						o.value = val || r;
						setImg();
					}
				});
			}
		});

	var $trash = $me.find('.ui-icon-trash').parent().click(function(){
		o.onChange(null, function(ok){
			$img.empty();
			$trash.hide();
		});
	});

	function setImg(){
		if(!o.value || !o.value.uri)
			return;

		$img.empty().appendThumb({
			src: o.value.uri + '?nwm=' + o.value.md5,
			thumbMaxWidth: 120,
			thumbMaxHeight: 100,
			imgWidth: o.value.width,
			imgHeight: o.value.height,
			expose: {color: '#FFF'},
			returnThumb: true
		});

		$trash.show();
	}

	setImg();

	return this.append('<div style="clear:both">');
};

$('body').on('click', '.form-thumb-delete', function(){
	var $this = $(this);

	$this.parents('form:first').data('mobileform').removeMedia(this, function(r){
		r === true && $this.parent().remove();
	});
});

})(jQuery);