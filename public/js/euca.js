"use strict";

(function ($) {
	window.euca = window.euca || {};

	window.l = window.console ? console.log.bind(console) : $.noop;
	window.t = window.console ? console.trace.bind(console) : $.noop;

	euca.server = euca.server || location.host;
	euca.isMobile = /^(phone|tablet)$/.test(euca.deviceType);

	$.lang = function (a) {
		return euca._lang[a] ? euca._lang[a] : a || '';
	};
	$.addLang = function (a) {
		$.extend(euca._lang, a);
	};
	$.safeLang = function (a, code) {
		if (!a || typeof(a) === 'string') return a;
		code = code || euca._LANGCODE;
		if (a[code])
			return a[code];
		let ret = '';
		$.each(a, function () {
			ret = this;
			return false;
		});
		return ret;
	};
	$.humanizeSize = function (bytes) {
		if (bytes < 1024)
			return bytes + "B";

		const exp = Math.floor(Math.log(bytes) / Math.log(1024));
		const pre = "KMGTPE".charAt(exp - 1) + 'B';
		return (bytes / Math.pow(1024, exp)).toFixed(1) + pre;
	};
	$.humanizeDuration = function (sec) {
		sec = parseFloat(sec.toString().replace(',', '.')) || 0;
		const s = Math.round((sec % 60) * 100) / 100;
		let m = Math.round(((sec - s) / 60));
		let h = '';
		if (m > 59) {
			const m_ = Math.round((m % 60) * 100) / 100;
			h = Math.round(((m - m_) / 60)) + 'h ';
			m = m_;
		}
		return h + m + 'm ' + s + 's';
	};
	$.count = function (obj) {
		let ret = 0;
		$.each(obj, function () {
			ret++;
		});
		return ret;
	};
	$.loading = function () {
		if (!$._loading) {
			// noinspection CssUnknownTarget
			$._loading = $('<div class="ui-widget-overlay"></div>' +
				'<div style="z-index:3;position:absolute;top:0;background:url(' + euca.staticUrl + '/cms/img/loader.gif) no-repeat center"></div>')
				.appendTo('body');
			$._loading.css({width: $(window).width(), height: $(window).height()});
			$(window).resize(function () {
				$._loading.css({width: $(window).width(), height: $(window).height()});
			});
		}
		$._loading.show();
	};
	$.loadingMsg = function () {
		$('body').append('<div id="fetchMsg" class="ui-widget ui-state-highlight">'
			+ '<span class="ui-icon ui-icon-signal-diag"></span>'
			+ euca._lang._FETCHING + '</div>');
	};
	$.endLoading = function () {
		$._loading.hide();
	};
	$.endLoadingMsg = function () {
		$('#fetchMsg').remove();
	};

	$.fn.loading = function () {
		return this.append('<img class="throbber_" src="' + euca.staticUrl + '/cms/img/throbber.gif"/>');
	};

	$.fn.endLoading = function () {
		this.find('> .throbber_').remove();
		return this;
	};

	$.loadCSS = function (url) {
		$('head').append('<link href="' + url + '" rel="stylesheet"/>');
		euca.cssLoaded.push(url);
	};
	$.args = function () {
		return JSON.stringify(Array.prototype.slice.call(arguments));
	};

	$.contentReadyFunctions = [];
	$.contentReady = function (f) {
		if (f) {
			$(window).bind('contentReady', f);
			$.contentReadyLoaded && f();
			return;
		}

		$.contentReadyLoaded = true;
		$(window).trigger('contentReady');
	};

	$.jsLoaded = function (f) {
		if (f)
			$(window).bind('jsloaded', f);
		else
			$(window).trigger('jsloaded');
	};

	$.alert = function (str, cb) {
		if ($.mobile) {
			return $('<div data-history="false" data-overlay-theme="b" data-dismissible="false" class="ui-popup ui-body-b ui-overlay-shadow ui-corner-all" style="min-width:400px;max-width:960px">\
				<div class="ui-header ui-bar-a">\
					<h1 class="ui-title">' + euca.sitename + '</h1>\
				</div>\
				<div role="main" class="ui-content">\
					<h3 class="ui-title">' + str + '</h3>\
					<a href="#" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b" data-rel="back" data-transition="flow">' + $.lang('_ACCEPT') + '</a>\
				</div>\
			</div>').popup().popup('open');
		} else {
			return $('<div style="padding:20px;width:auto"><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px;"></span>' + str + '</div>').dialog({
				title: euca.sitename,
				modal: true,
				buttons: [
					{
						text: $.lang('_ACCEPT'),
						click: function () {
							$(this).dialog('close');
						}
					}
				],
				close: function () {
					cb && cb();
					$(this).remove();
				}
			});
		}
	};

	/**
	 * @param {object} options : [title, message, onClick, buttonA, buttonB]
	 * @param {function } cb : function
	 */
	$.confirm = function (options, cb) {
		if (typeof options === 'string')
			options = {message: options};

		if (cb)
			options.onClick = cb;

		const o = $.extend({
			title: euca.sitename,
			message: '',
			onClick: $.noop,
			def: 'accept',
			buttonA: $.lang('_ACCEPT'),
			buttonB: $.lang('_CANCEL')
		}, options);

		if (!$.mobile) {
			const buttonCancel = {
				text: o.buttonB,
				ret: false
			}
				, buttonAccept = {
				text: o.buttonA,
				ret: true
			}
				, buttons = {}
				, order = o.def === 'accept' ? [buttonAccept, buttonCancel] : [buttonCancel, buttonAccept];

			$.each(order, function () {
				const t = this;
				buttons[this.text] = function () {
					$(this).dialog('close');
					o.onClick(t.ret);
				};
			});

			$('<div style="padding:20px;text-align:center"><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span>' + o.message + '</div>')
				.dialog({
					title: o.title,
					modal: true,
					buttons: buttons,
					close: function () {
						$(this).remove();
						o.onClick(false);
					}
				});
		} else {
			let $popup = $("#notiPopup");

			if (!$popup.size()) {
				$popup = $('<div id="notiPopup" data-history="false" data-transition="none" class="ui-popup ui-body-a ui-overlay-shadow ui-corner-all ui-body-b" style="min-width:400px">\
				<div class="ui-header ui-bar-b">\
					<h1 id="noti-title" class="ui-title"></h1>\
				</div>\
				<div role="main" class="ui-content">\
					<h3 id="noti-msg" class="ui-title"></h3>\
					<div id="noti-desc"></div>\
					<a id="noti-ok" href="#" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b" data-transition="flow"></a>\
					<a id="noti-cancel" href="#" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-c" data-rel="back" data-transition="flow"></a>\
				</div>\
			</div>').popup();
			}

			$('#noti-title').html(o.title);
			$('#noti-msg').html(o.message);
			$('#noti-desc').html(o.description);
			$('#noti-ok').html(o.buttonA);
			$('#noti-cancel').html(o.buttonB);

			$popup.data('options', o).popup('open');
		}
	};

	$.prompt = function (options, complete) {
		if (complete)
			options = {message: options, complete: complete};

		const o = $.extend({
			cancelName: $.lang('_CANCEL'),
			submitName: 'OK',
			message: '',
			description: '',
			value: '',
			title: euca.sitename,
			fieldType: 'input',
			complete: $.noop
		}, options);

		const field = o.fieldType === 'textarea'
			? '<textarea style="margin:12px auto; width: 94%">' + o.value + '</textarea>'
			: '<label><input type="text" value="' + o.value + '" style="width: ' + (o.width - 34) + 'px;"/></label>';

		let $dg;

		if ($.mobile) {
			$dg = $('<div id="promptDialog" data-history="false" data-overlay-theme="b" data-transition="none" class="ui-popup ui-body-a ui-overlay-shadow ui-corner-all ui-body-b" style="min-width:400px;text-align:center">' +
				'<div class="ui-header ui-bar-b">\
                    <h3 class="ui-title">' + o.message + '</h3>\
			</div><form><p>' + o.description + '</p>'
				+ field + '<div class="ui-input-btn ui-btn ui-corner-all ui-shadow">' + $.lang('_SUBMIT') + '<input type="submit"></div></form>\
		</div>');

			$dg.append('<a href="#" data-rel="back" class="ui-btn ui-corner-all ui-shadow ui-btn-a ui-icon-delete ui-btn-icon-notext ui-btn-right"></a>');
			$dg.appendTo('.ui-page-active')
				.find('form>*:first').textinput()
				.end()
				.popup({
					afterclose: function () {
						$dg.popup('destroy').remove();
					}
				})
				.popup('open');

			const $field = $dg.find(o.fieldType + ':first');

			setTimeout($field.select.bind($field), 200);
		} else {
			$dg = $('<div id="promptDialog"><p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span>' + (o.message) + '</p></div>\
			<form>' + field + '</form>\
		</div>');

			$dg.dialog({
				title: o.title,
				width: o.width,
				modal: true,
				buttons: [
					{
						text: o.cancelName,
						click: function () {
							$(this).dialog('close');
						}
					}, {
						text: o.submitName,
						click: function () {
							$(this).find('form').submit();
						}
					}
				],
				close: function () {
					$(this).dialog('destroy').remove();
				}
			});
		}

		$dg.find('form').submit(function (e) {
			e.preventDefault();

			o.complete($(this).find('input, textarea').val());

			if ($.mobile)
				$dg.popup('close');
			else
				$dg.dialog('close');
		})
			.find('input:first').select();

		return $dg;
	};

	/**
	 * Creates an icon and returs de jQuery object
	 *
	 * @param {object} options {onCLick: func(), icon: 'info', title: '', container: $()}
	 */
	$.createIcon = function (options) {
		const o = $.extend({
			onClick: $.noop,
			icon: 'info',
			title: '',
			container: null,
			cssFloat: 'left'
		}, options);

		const $ret = $('<span style="cursor: pointer; float: ' + o.cssFloat + '; border:1px solid transparent; display: inline-block">\n\
			<span class="ui-icon ui-icon-' + o.icon + '"></span>\n\
		</span>')
			.attr('title', o.title)
			.click(o.onClick)
			.hover(function () {
				$(this).toggleClass('ui-state-hover');
			});

		if (o.container)
			$ret.appendTo(o.container);

		return $ret;
	};

// DOM functions
	$.fn._resize = function (delay) {
		return this.setTimeout(function () {
			this.trigger('resize');
		}, delay);
	};
	//desplaza la ventana para que el elemento se muestre entero
	$.fn.inWindow = function (margin, speed) {
		margin = margin || 0;
		const o = this.offset(),
			wTop = $(window).scrollTop(),
			wBottom = $(window).height() + wTop;
		let targetTop;
		const height = this.height() + parseInt(this.css('padding-top')) + parseInt(this.css('padding-bottom')),
			bottom = o.top + height;
		if (o.top < wTop + margin)
			targetTop = o.top - margin;
		else if (bottom > wBottom - margin) {
			targetTop = wTop + o.top - wBottom + height + margin;
		}
		if (targetTop) {
			if (targetTop < wTop - margin)
				targetTop = o.top - margin;
			$('body').animate({scrollTop: Math.max(0, targetTop)}, speed);
		}
		return this;
	};
	//desplaza la ventana para que el elemento se muestre entero
	$.fn.inWindowH = function () {
		const s = $.extend({
			margin: 0
		});
		const o = this.offset(),
			wTop = $(window).scrollTop(),
			wBottom = $(window).height() + wTop;
		let targetTop;
		const height = this.height() + parseInt(this.css('padding-top')) + parseInt(this.css('padding-bottom')),
			bottom = o.top + height;
		if (o.top < wTop + s.margin)
			targetTop = o.top - s.margin;
		else if (bottom > wBottom - s.margin) {
			targetTop = wTop + o.top - wBottom + height + s.margin;
		}
		if (targetTop) {
			if (targetTop < wTop - s.margin)
				targetTop = o.top - s.margin;
			$($.browser.webkit ? 'body' : 'html').animate({scrollTop: Math.max(0, targetTop)}, s.speed);
		}
		return this;
	};
	$.fn.setTimeout = function (fn, t) {
		t = t || 100;
		const dom = this;
		setTimeout(function () {
			fn.call(dom);
		}, t);
		return this;
	};
	$.fn.exec = function (fn) {
		fn.call(this);
		return this;
	};
	$.fn.newOverlay = function (options) {
		return this.each(function () {
			$(this).overlay($.extend(options, {api: true})).load();
		});
	};
	$.fn.error = function () {
		return this.divMsg('error', 'alert');
	};
	$.fn.highlighted = function () {
		return this.divMsg('highlight');
	};
	$.fn.divMsg = function (state, icon) {
		state = state || 'default';
		icon = icon || 'info';
		return this.addClass('ui-widget ui-state-' + state + ' ui-corner-all').css('padding', '0.7em').each(function () {
			const content = $(this).html();
			$(this).html('<span class="ui-icon ui-icon-' + icon + '" style="float: left; margin-right: .3em;"></span><span> ' + content + '</span>');
		});
	};

	$.jsLoaded(function () {
		let lastData
		;const csrf = $('head meta[name="csrf"]').attr('content')
			, setup = {
				url: '/ajax',
				cache: true,
//		dataType: 'json',
				error: function (request, status, error) {
					window.console && console.error && console.error(error);

					$('#fetchMsg').remove();

					switch (status) {
						case 'timeout':
							$.alert("El servidor no responde");
							break;
						case 'parsererror':
							lastData && $.alert(lastData);
							break;
						case 'error':
						case 'notmodified':
						default:
						// comentado porque al cambiar la url si hay una petición ajax (p.e. chat)
						// TODO: buscar una solución
						//msg("Error en la respuesta del servidor."+status);
					}
				},
				dataFilter: function (data) {
					lastData = data;
					return data;
				}
			};

		if (csrf)
			setup.headers = {
				"xsrf-token": csrf
			};

		$.ajaxSetup(setup);

		// HTML5 navigation
		if (history.pushState) {
			$('body').on('click', 'a.ic', function () {
				$.lastPushStateTrigger = $(this);
				history.pushState({rel: this.rel}, '', this.href);
				window.onpopstate({state: {rel: this.rel, uri: this.href}});
				return false;
			});
		}

		//Set loaded css
		euca.cssLoaded = [];

		$('head link[rel="stylesheet"]').each(function () {
			euca.cssLoaded.push(/^[^?]+/.exec($(this).attr('href'))[0]);
		});

		euca.combinedCSS && $.each(euca.combinedCSS, function () {
			euca.cssLoaded.push(euca.staticUrl + this);
		});

		if ($.mobile)
			$.mobile.ajaxEnabled = euca.mobileAjaxEnabled;

		$.contentReady();
	});

	window.onpopstate = function (e) {
		//WebKit fires the event on page load
		if (!e.state || !e.state.uri)
			return;

		$.loadContent({
			url: e.state.uri || location.toString()
		});
	};

	$.loadContent = function (options) {
		const o = $.extend({
			url: null,
			done: $.noop
		}, options);

		$.ajax({
			url: o.url,
			data: {'X-Euca': 'content'},
			headers: {'X-Euca': 'content'}
		}).done(function (d) {
			$.each(d.content, function (selector, value) {
				$(selector).html(value);
			});

			$.each(d.attr, function (selector, attrs) {
				const $obj = $(selector);
				$.each(attrs, function (k, v) {
					$obj.attr(k, v);
				});
			});

			$.extend(euca._lang, d.jslang);

			$.each(d.css, function () {
				const src = this.toString();
				if ($.inArray(src, euca.cssLoaded) === -1) {
					euca.cssLoaded.push(src);
					$.loadCSS(src);
					$.info('Get css: ' + src);
				} else
					$.info(src + ' already loaded');
			});


			$.loadJS(d.js, $.contentReady);

			o.done();
		});
	};

	$(function () {
		$('body').on('click', '#noti-ok', function () {
			const $notiPopup = $('#notiPopup');

			//hay que esperar a que se cierre el popup
			$notiPopup
				.one('popupafterclose', $notiPopup.data('options').onClick.bind($notiPopup[0]))
				.popup('close');
		});
	});

})(jQuery);
