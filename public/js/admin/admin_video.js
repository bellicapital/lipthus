$.fn.adminVideo = function(s){
	var arrayVersions = [];
	this.append('<table><tr><td id="adminVideoMenu">\
	  <div class="adminVideoDatas">\
	  </div>\
	  <div class="adminVideoPanel">\
		<h3><a href="#">Splash image</a></h3>\
		<div class="adminVideoSplash"></div>\
	  </div>\
	  <div class="adminVideoPanel">\
		<h3><a href="#">Video versions</a></h3>\
		<div class="adminVideoVersions"></div>\
	  </div>\
	</td><td id="adminVideoBody">\
		<div id="adminVideoSplashImg" style="width: ' + s.width + 'px;"></div>\
		<div id="adminVideoVideo"></div>\n\
		<div id="adminVideoDetails" class="ui-widget-content ui-corner-all"></div>\
	</td></tr></table>');

	//Title & Status
	$('<div></div>').appendTo('.adminVideoDatas').iForm({
		vars: {
			title: {
				caption: euca._lang._TITLE,
				formtype: 'text',
				value: s.title
			},
			active: {
				caption: 'Activo',
				formtype: 'yesno',
				value: s.itemStatus
			}
		},
		onValueChange: function(ele, value){
			$.ajax({
				data: {classname: 'eucavideo', id: s.id, args: $.args(ele, value), method: 'changeVar'},
				type: 'post',
				success: function(){
					$('.adminVideoDatas').find('.loading16').removeClass('loading16');
				}
			});
		}
	});

	$('#adminVideoMenu')
		.on('mouseover mouseout', 'li', function(){
			$(this).toggleClass('ui-state-hover');
		})
		.on('click', 'li a', function(){
			$('#adminVideoMenu').find('li').removeClass('ui-state-active');
			$(this).parent().addClass('ui-state-active');
			$('#adminVideoDetails').show();
		});

	//Splash
	var $avs = $('.adminVideoSplash');

	$('<a href="#" id="adminVideoSplashThumb"><img src="' + s.thumb.url + '" alt="Splash thumbnail"/></a>')
		.appendTo($avs).click(function(){
			//todo: show splash
			return false;
	});
	$avs.append('<br/>');

	var $avv = $('#adminVideoVideo');

	$('<a href="#">Capturar fotograma</a>').appendTo($avs).click(function(){
		$avv.hide();
		$('#adminVideoDetails').empty();
		var sec = $avv.data('flowplayer');
		sec = sec ? parseInt(sec.getTime()) : 0;
		$('#adminVideoSplashImg').empty().show().frameCapturer({
			id: s.id,
			fps: s.fps,
			duration: parseFloat(s.duration),
			basename: s.basename,
			width: s.width,
			height: s.height,
			sec: sec
		});
		return false;
	});

	$avs.append('<br style="clear:both"/>');

	//Versions
	var $ulv = $('<ul></ul>').appendTo(this.find('.adminVideoVersions'));
	
	s.versions.original = s.id;
	
	$.each(s.versions, addVersion);
	
	var $defaultVideoLink = $ulv.find('li[rel=normal]');
	
	if(!$defaultVideoLink.size())
		$defaultVideoLink = $ulv.find('li[rel=original]');
	
	$defaultVideoLink.click();

	function addVersion(version, id){
		arrayVersions.push(parseInt(s.versions[version].height, 10));
		$('<li class="ui-widget-content" style="position: relative;" rel="' + version + '"><a href=";">' + version + '</a></li>')
			.appendTo($ulv).click(function(){
				$(this).siblings().removeClass('ui-state-active');
				$(this).addClass('ui-state-active');
				$('#adminVideoSplashImg').hide();
				$avv.width(640).height(360).video({
					url: euca.path + '/fs/' + id,
					onMetaData: function(m){
						$('#adminVideoDetails').find('.metadata').videoMetadata(m);
//							$('#adminVideoMenu .objUL').remove();
//							$('#adminVideoMenu').appendObjUL(m);
					}
				});
				$avv.show();
				$.ajax({
					data: {
						classname: 'videoversion',
						id: id,
						method: 'metadata'
					},
					success: function(d){
						var url = euca.staticUrl + '/fs/' + id + '/' + d.name;
						$('#adminVideoDetails').videoDetails(d)
							.append('<br style="clear: both"/><a target="_blank" href="' + url + '">' + url + '</a>');
					}
				});
				return false;
			});
	}

	$('<a href="#">check</a>').appendTo('#adminVideoMenu').click(function(){
		$.ajax({
			data: {classname: 'GridFSVideo', id: s.id, method: 'check'},
			success: function(d){
				l(d);
			}
		});
		$('#checkresults')
	}).after('<div id="checkresults"></div>');
	$('.adminVideoPanel', this).panel({width:170});

	return this;
};

$.fn.videoDetails = function(d){
	this.empty();
	$('<div style="float:left; padding: 6px;"><div class="ui-widget-header">Datos generales</div></div>').appendTo(this).append(
		'<div>Duración: ' + d.duration + ' segundos</div>\
		<div>Tamaño: ' + $.humanizeSize(d.size) + '</div>\
		<div>Bitrate: ' + Math.round(d.bitrate) + '</div>'
	);
	$('<div style="float:left; padding: 6px;"><div class="ui-widget-header">Datos de video</div></div>').appendTo(this).append(
		'<div>Fps: ' + d.fps + '</div>\
		<div>Bitrate: ' + d.videoBitrate + '</div>\
		<div>Codec: ' + d.videoCodec + '</div>\
		<div>Ancho: ' + d.width + ' px</div>\
		<div>Alto: ' + d.height + ' px</div>'
	);
	$('<div style="float:left; padding: 6px;"><div class="ui-widget-header">Datos de audio</div></div>').appendTo(this).append(
		'<div>Bitrate: ' + Math.round(d.audioBitrate) + '</div>\
		<div>Canales: ' + d.audioChannels + '</div>\
		<div>Codec: ' + d.audioCodec + '</div>\
		<div>Sample Rate: ' + d.audioSampleRate + '</div>'
	);
	$('<div style="float:left; padding: 6px;" class="metadata"></div>').appendTo(this);
	
	return this;
};

$.fn.videoMetadata = function(m){
	this.html('<div class="ui-widget-header">Metadata</div>')
		.appendObjUL(m, ['width', 'height', 'videocodecid', 'audiocodecid', 'audiochannels', 'audiosamplerate', 'avcprofile', 'videoframerate', 'aacaot', 'moovposition', 'duration']);
};

$.fn.appendObjUL = function(obj, filter, hidden){
	return this.each(function(){
		if(!obj) return false;
		var $ul = $('<ul class="objUL">').appendTo(this);
		hidden && $ul.hide();
		filter = filter || [];

		obj.keys.forEach(function(i){
			if($.inArray(i, filter) == -1){
				var ele = obj[i];
				var $li = $('<li style="margin:0;padding:0">').appendTo($ul);//$('body').append(typeof(i) + ' ' + typeof(ele) + ' ' + i + ' ' + ele.toString() +'<br/>');
				if(i != parseInt(i))//typeof(i) != 'number'
					$li.append('<b>' + i + ': </b>');
				if($.isArray(ele)){
					$li.append(' (' + ele.length + ')');
					ele.length && $li.appendObjUL(ele, filter, true).find('b:first').css('cursor', 'pointer').click(function(){
						$(this).next().toggle();
					});
				} else if($.isPlainObject(ele))
					$li.appendObjUL(ele, filter);
				else $li.append(ele.toString());
			}
		});

		return true;
	});
};

$.fn.frameCapturer = function(options){
	var o = $.extend({
		sec: 0,
		frame: 10,
		playSpeed: 3
	}, options);

	if(!o.id || !o.fps || !o.duration) return this;
	var asked = {},
		str,
		src,
		playInt,
		lastSecondFrames = Math.round(Math.round((o.duration % 1) * 100) * o.fps / 100),
		$butt = $('<span style="padding: 10px 4px;" class="ui-widget-header ui-corner-all"></span>').appendTo(this),
		$imgDiv = $('<div class="ui-widget-content"></div>').appendTo(this).css({width: o.width, height: o.height}),
		$img = $('<img width="' + o.width + '" height="' + o.height + '"/>').appendTo($imgDiv).click(stop);

	$butt.after('<br/><br/>');

	this.append('<span id="tcIndicator">' + humanFrame() + '</span>');
	var $timeSlider = $('<div style="margin-top: 10px"></div>').appendTo(this).slider({
		max: Math.floor(o.duration) * o.fps + lastSecondFrames,
		min: 1,
		value: o.sec * o.fps + o.frame,
		//step: o.fps,
		slide: function(event, ui) {
			o.frame = ui.value % o.fps;
			o.sec = (ui.value - o.frame) / o.fps;
			//$('#tcIndicator').html(humanFrame());
			setTime();
		}
	});
	$.loading();
	$.ajax({
		data: {handler: 'eucavideo', id: o.id, itemmethod: 'extractAllFrames'},
		async: false,
		success: function(d){
			$.endLoading();
			if(d)
				setTime();
			else
				$img.hide().after('<div id="fc_err" class="errorMsg">No se ha podido obtener el fotograma</div>');
		}
	});



	function setTime(){
		//src = 'fs/cache?evId=' + o.id + '&filename=' + (o.sec * o.fps) + o.frames + '.jpg';
		src = 'frames/' + o.id + '/' + o.basename + '_' + ((o.sec * o.fps) + o.frame) + '.jpg';
		$img.attr('src', src);
		$('#tcIndicator').html(humanFrame());
		$timeSlider.find('a').css('left',(((o.sec * o.fps) + o.frame) * 100 / (o.duration * o.fps))+'%');
	}

	function play(){
		playInt = setInterval(framePlus, 1000 / o.playSpeed);
		$slider.show();
	}

	function stop(){
		clearInterval(playInt);
		$slider.hide();
	}

	function framePlus(){
		if(o.sec == Math.floor(o.duration) && o.frame == lastSecondFrames)
			return;

		if(o.frame == o.fps){
			o.frame = 1;
			o.sec++;
		} else
			o.frame++;
		setTime();
	}

	setTime();

	$.each({
		beginning : {alt: 'Primer fotograma', icon: 'seek-start', action: function(){
			o.frame = 1;
			o.sec = 0;
		}},
		rewind	: {alt: 'Fotograma anterior', icon: 'seek-prev', action: function(){
			if(o.frame == 1){
				if(!o.sec) return;
				o.frame = 25;
				o.sec--;
			} else
				o.frame--;
		}},
		play: {alt: 'Reproduce en secuencia', icon: 'play', action: play},
		stop: {alt: 'Detener', icon: 'stop', action: stop},
		forward: {alt: 'Fotograma posterior', icon: 'seek-next', action: framePlus},
		end: {alt: 'Último fotograma', icon: 'seek-end', action: function(){
			o.frame = lastSecondFrames;
			o.sec = Math.floor(o.duration);
		}}
	}, function(i,v){
		$('<button>' + v.alt + '</button>')
			.appendTo($butt)
			.button({text: false, icons: {primary: 'ui-icon-' + v.icon}})
			.click(function(){
				v.action();
				setTime();
				$(this).removeClass('ui-state-focus');
			});
	});
	$('<button>Seleccionar</button>').appendTo($butt).button().click(function(){
		$.ajax({
			data: {
				handler: 'eucavideo',
				id: o.id, 
				op: 'createSplashImageFromFrame',
				frame: (o.sec * o.fps) + o.frame
			},
			type: 'post',
			success: function(d) {
				if(d!=false){
					$('#adminVideoSplashThumb').find('img').attr('src', $img.attr('src'));
					$('img[src^="splash/'+o.id+'"]').attr('src', $img.attr('src'));
				} else
					$.alert('error');
			}
		});
	});
	$('.ui-icon').css('left', '1em');
	var $slider = $('<div style="float:right; text-align:right; display:none;"><span id="f_speed">' + o.playSpeed + ' fps</span>').insertAfter($butt);
	$('<div style="width:200px;"></div>').appendTo($slider).slider({
		value: 3,
		max: o.fps,
		slide: function(event, ui) {
			clearInterval(playInt);
			o.playSpeed = ui.value;
			play();
			$('#f_speed').html(ui.value + ' fps');
		}
	});

	$img.error(function(){
			if(asked[str]){
				$('.errorMsg').remove();
				$(this).hide().after('<div id="fc_err" class="errorMsg">No se ha podido obtener el fotograma</div>');
				return;
			}
			asked[str] = true;

		})
		.load(function(){
			$img.show();
			$('#fc_err').remove();
		});


	function humanFrame(){
		var secs = o.sec % 60,
			minutes = (o.sec - secs) / 60,
			hours = 0,
			ret = '';
		if(minutes){
			hours = Math.floor(minutes / 60);
			if(hours)
				minutes = hours * 60 - minutes;
		}
		ret += $.leftZeroed(hours) + ':' + $.leftZeroed(minutes) + ':' + $.leftZeroed(secs) + ':' + $.leftZeroed(o.frame);
		return ret;
	}

	return this;
};

$.leftZeroed = function(n, d){
	d = d || 2;
	var ret = '';
	for(var i = 0; i < d; i++)
		ret += '0';
	ret += n;
	return ret.substr(-d);
};