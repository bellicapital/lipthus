"use strict";


(function($){

	var T = window.Tablet = {
		debug: false,
		tries: 0,
		baseUri: location.protocol + "//tablet.sigwebtablet.com:472" + (location.protocol === 'https:' ? "90" : '89') + "/SigWeb/",
		fontThreshold: 155,
		refreshInterval: 100,
		msg: 'Firmar aquí:',
		okMsg: 'Gracias por firmar',
		clearBtn: 'Limpiar',
		okBtn: 'OK',
		logo: 'http://www.topazsystems.com/SigWeb/topazlogo43.bmp',
		onConnect: $.noop,
		onError: function(err){
			T.debug && console.error(err);
		},
		get: function(prop){
			return T.xhrPromise(prop);
		},
		set: function(prop, v){
			if(v !== undefined)
				prop += '/' + v;

			return T.xhrPromise(prop, 'post');
		},
		xhrPromise: function(prop, type){
			return new Promise(function(resolve, reject){
				$.ajax({
					url: T.baseUri + prop,
					type: type || 'get',
					timeout: 4000,
					beforeSend: function(xhr){
						xhr.withCredentials = false;
						//eliminia este header. no poner null como valor. No funciona.
						xhr.setRequestHeader("xsrf-token");
					},
					xhrFields: {
						withCredentials: false
					},
					success: function(d){
						resolve(d);
					},
					headers: {"xsrf-token": null},
					error: function(r){
						if(r.status === 200)
							resolve();
						else
							reject(new Error(r.statusText + ' - ' + prop));
					}
				});
			});
		},
		checkTablet: function(){
			return new Promise(function(resolve, reject){
				T.set('TabletState', 1)
					.then(bget('TabletModelNumber'))
					.then(function(retmod){
						T.Model = retmod;
					})
					.then(bget('TabletSerialNumber'))
					.then(function(retser){
						T.Serial = retser;
					})
					.then(bset('TabletState', 0))
					.then(function(){
						if(!T.Model) {
							// Puede no haber quedado bien finalizada, entonces Model === 0.
							if(++T.tries > 2)
								return reject(new Error('Tablet not ok'));

							// Se reintenta 2 veces más
							return T.end(true).then(function () {
								T.checkTablet().then(resolve, reject);
							});
						}

						// reseteamos el contador de intentos
						T.tries = 0;

						T.TabletOK = T.Model === 8 || (T.Model === 58 && (T.Serial === 553 || T.Serial === 557));
						T.TabletOK ? resolve() : reject(new Error('Tablet not ok'));
					}, reject);
				});
		},
		start: function(options){
			T.ended = false;

			$.extend(T, options);

			return T.checkTablet()
				.then(function(){
					$.mobile.loading('show', {
						text: "Preparando la tableta de firma",
						textVisible: true
					  });
				})
				.then(T.setTabletStateOn)
				.then(bset('JustifyMode', 0))
				.then(T.draw)
				.then(function(){
					$.mobile.loading('hide');

					if(T.ended)
						return T.end(true);

					T.clearTimers();
					T.timer = setInterval(T.refresh, T.refreshInterval);
					T.connected = true;
					T.onConnect();
				}, T.onError);
		},
		draw: function(){
			return Promise.all([
				T.LcdRefresh(0, 0, 0, 240, 128),
				T.set('KeyPadClearHotSpotList'),
				T.clearSigWindowOutside(),
				T.clearTablet()
			])
				.then(bind('LCDWriteString', [0, 3, 0, 0, "9pt Arial", 20, T.msg]))
				.then(bset('CaptureMode', 2));
		},//todo. thanks for signing
		ok: function(){
			T.clearTimers();

			var ret = T.LcdRefresh(0, 0, 0, 240, 128)
					.then(bind('LCDWriteString', [0, 3, 0, 0, "10pt Arial", 28, T.okMsg]));

			if(T.logo)
				ret = ret.then(function(){
					T.LcdWriteImage(0, 2, 30, 40, T.logo)
						.catch(console.error.bind(console));
					});

			return ret;
		},
		_stop: function(){
			T.ended = true;

			T.clearTimers();

			Tablet.onConnect = Tablet.end;
		},
		end: function(force){
			T._stop();

			if(!T.connected && !force)
				return;

			return T.LcdRefresh(0, 0, 0, 240, 128)
				.then(bind('LCDSetWindow', [0, 0, 240, 128]))
				.then(bind('SetSigWindow', [1, 0, 0, 240, 128]))
				.then(bset('KeyPadClearHotSpotList'))
				.then(bset('CaptureMode', 1))
				.then(T.clearTablet)
				.then(bset('TabletState', 0));
		},
		abort: function(){
			T._stop();

			if(navigator.sendBeacon)
				navigator.sendBeacon(T.baseUri + '/LcdRefresh/0,0,0,240,128');
			else
				Promise.resolve(T.LcdRefresh(0, 0, 0, 240, 128));
		},
		listenEvents: function(handler, delay){
			T.onSigPenUp = handler;
			T.eventTmr = setInterval(T.event, delay || 20);
		},
		clearTimers: function(){
			if (T.timer)
				clearInterval(T.timer);
			if (T.eventTmr)
				clearInterval(T.eventTmr);
		},
		clearTablet: function(){
			return T.get('ClearSignature');
		},
		clearSigWindowOutside: function(){
			return T.set('ClearSigWindow', 1);
		},
		setTabletState: function(v) {
			if(v)
				return T.setTabletStateOn();
			else
				return T.setTabletStateOff();
		},
		setTabletStateOn: function() {
			return new Promise(function(resolve){
				T
					.set('DisplayXSize', parseInt(T.ctx.canvas.width * 1.24))
					.then(bset('DisplayYSize', parseInt(T.ctx.canvas.height * 1.81)))
					.then(bset('TabletState', 1))
					.then(resolve);
			});
		},
		setTabletStateOff: function() {
			T.clearTimers();
			T.ctx = null;
			T.set('TabletState', 0);
		},
		KeyPadQueryHotSpot: function(key){
			return T.get('KeyPadQueryHotSpot/' + key);
		},
		/**
		 * Sends tablet a refresh command with 4 possible modes. Mode 0-
			Clear, display is cleared at the specified location. Mode 1-Complement,
			complements display at the specified location. Mode 2-WriteOpaque, transfers
			contents of the background memory to the LCD display, overwriting the content
			of the LCD display. Mode 3-WriteTransparent, transfers contents of the
			background memory in the tablet to the LCD display and combined in the
			contents of the LCD display
		 * @param {number} Mode - (0-4)
		 * @param {number} Xp - XPos-Location in LCD coordinates
		 * @param {number} Yp - YPos-Location in LCD coordinates
		 * @param {number} Xs - X size in LCD pixels
		 * @param {number} Ys - Y size in LCD pixels
		 * @returns {Promise}
		 */
		LcdRefresh: function(Mode, Xp, Yp, Xs, Ys){
			return T.set('LcdRefresh', Mode + "," + Xp + "," + Yp + "," + Xs + "," + Ys);
		},
		LCDSetWindow: function(xP, yP, xS, yS){
			return T.set('LCDSetWindow', xP + "," + yP + "," + xS + "," + yS);
		},
		/**
		 * sets a window in the logical tablet space that restricts the operation of some functions to the specified window
		 * @param {number} coords - Coordinate system used for this hot spot, 0 = Logical tablet coordinates, 1 = LCD Coordinates
		 * @param {number} xp - NewXPos-Location in logical tablet coordinates
		 * @param {number} yp - NewYPos-Location in logical tablet coordinates
		 * @param {number} xs - XSize in logical tablet pixels
		 * @param {number} ys - YSize in logical tablet pixels
		 * @returns {Promise}
		 */
		SetSigWindow: function(coords, xp, yp, xs, ys){
			return T.set('SigWindow', coords + "," + xp + "," + yp + "," + xs + "," + ys);
		},
		/**
		 * Defines in software the location of a tablet HotSpot which is used by the developer to detect user pen taps
		 * @param {number} key - Integrer value defining the HotSpot
		 * @param {number} coord - Coordinate system used for this HotSpot
		 * @param {number} xp - NewXPos-Location in logical tablet coordinates
		 * @param {number} yp - NewYPos-Location in logical tablet coordinates
		 * @param {number} xs - XSize in logical tablet pixels
		 * @param {number} ys - YSize in logical tablet pixels
		 * @returns {Promise}
		 */
		KeyPadAddHotSpot: function(key, coord, xp, yp, xs, ys){
			return T.set('KeyPadAddHotSpot', key + "," + coord + "," + xp + "," + yp + "," + xs + "," + ys);
		},
		/**
		 * This writes a bitmap image to the LCD from the URL specified.
		 *
		 * @param {number} Dst - 0=Foreground,1=Background memory in tablet
		 * @param {number} Mode - 0-3 as defined in LCDWriteBitmap
		 * @param {number} Xp - XPos-Location in LCD coordinates
		 * @param {number} Yp - YPos-Location in LCD coordinates
		 * @param {string} Url
		 * @returns {Promise}
		 */
		LcdWriteImage: function(Dst, Mode, Xp, Yp, Url){
			var NewUrl = Url.replace(/\//g, "_");

			return T.set('LcdWriteImage', Dst + "," + Mode + "," + Xp + "," + Yp + "," + NewUrl);
		},
		/**
		 * Used to write a string to the LCD Display. The data is written at the
		 * location specified by the combination of Dest, XPos, and YPos. The Mode
		 * determines how the data is written.
		 *
		 * Mode 0 - Clear: The Display is cleared at the specified location.
		 * Mode 1 - Complement: The Display is complemented at the specified location.
		 * Mode 2 - WriteOpaque: The contents of the background memory in the tablet are transferred to the LCD display, overwriting the contents of the LCD display.
		 * Mode 3 - WriteTransparent: The contents of the background memory in the tablet are combined with and transferred to the visible LCD memory

		 * @param {int} dest - 0 = Foreground, 1 = Background memory in tablet
		 * @param {int} mode - 0, 1, 2, 3 as defined above
		 * @param {int} x - XPos-Location in LCD coords to draw at
		 * @param {int} y - YPos-Location in LCD coords to draw at
		 * @param {int} fnt - WebFont. Example: “10pt Arial”
		 * @param {int} height
		 * @param {string} str - String to write to LCD
		 */
		LCDWriteString: function(dest, mode, x, y, fnt, height, str) {
			return new Promise(function(resolve, reject){
				var c = document.createElement('canvas');
				var cntx = c.getContext('2d');
				cntx.font = fnt;
				var xs = Math.round(cntx.measureText(str).width);

//				if (!xs)
//					return resolve();

				var ys = height;
				c.width = xs;
				c.height = ys;

				cntx.font = fnt;
				cntx.fillStyle = '#FFFFFF';
				cntx.rect(0, 0, xs, ys);
				cntx.fill();


				cntx.fillStyle = '#000000';
				cntx.textBaseline = "top";
				cntx.fillText(str, 0, 0);

				cntx.drawImage(cntx.canvas, 0, 0, xs, ys);

				var Gstr = T.createLcdBitmapFromCanvas(c, xs, ys);

				T.LcdWriteImageStream(dest, mode, x, y, xs, ys, Gstr).then(resolve, reject);
			});
		},
		LcdWriteImageStream: function(Dst, Mode, Xp, Yp, Xs, Ys, Url) {
			return new Promise(function(resolve, reject){
				T.set('LcdWriteImageStreamParams', Dst + "," + Mode + "," + Xp + "," + Yp + "," + Xs + "," + Ys)
					.then(T.bind('setImageStreamProperty', ['LcdWriteImageStream/', Url]))
					.then(resolve, reject);
			});
		},
		setImageStreamProperty: function(prop, strm) {
			return new Promise(function(resolve, reject){
				var xhr = new XMLHttpRequest();

				xhr.open("POST", T.baseUri + prop);
				xhr.setRequestHeader("Content-Type", "image/png");

				xhr.onload = function(){
					if (this.status === 200)
						resolve(xhr.response);
					else
						reject(this.statusText);
				};

				xhr.send(strm);
			});
		},
		createLcdBitmapFromCanvas: function(ourCanvas, width, height) {
			var canvasCtx = ourCanvas.getContext('2d');
			var imgData = canvasCtx.getImageData(0, 0, width, height);
			var j = 0;
			var outData = "";
			var data = imgData.data;

			for (var y = 0; y < height; y++)
				for (var x = 0; x < width; x++) {
					var tmp1 = data[j];

					j = j + 4;
					if (tmp1 < T.fontThreshold) {
						outData += "B";
					}
					else {
						outData += "W";
					}
				}

			return outData;
		},
		refresh: function() {
//			return T.getSigImageB64().then(function(r){console.log(arguments);
////				console.log(7777, r.img);
//				T.ctx.drawImage(r.img, 0, 0);
//				$('#img-monit').attr('src', r.img.src);
//			});

			var xhr2 = new XMLHttpRequest();
			xhr2.open("GET", T.baseUri + "SigImage/0");
			xhr2.responseType = "blob";
			xhr2.onload = function () {
				var img = new Image();
				img.src = URL.createObjectURL(xhr2.response);
				img.onload = function () {
					var w = T.ctx.canvas.width
					,	h = T.ctx.canvas.height;

					T.ctx.drawImage(img, w*.115, h*.315, w, h, 0, 0, w, h);
//					$('#img-monit').attr('src', img.src);
					URL.revokeObjectURL(this.src);
					img = null;
				};
			};
			xhr2.send();
		},

		getSigImageB64: function(){
			var cvs = document.createElement('canvas');

			return new Promise(function(resolve, reject){
				T.get('ImageXSize')
					.then(function(x){
						cvs.width = x;

						T.get('ImageYSize')
							.then(function(y){
								cvs.height = y;

								var xhr2 = new XMLHttpRequest();

								xhr2.open("GET", T.baseUri + "SigImage/1");
								xhr2.responseType = "blob";
								xhr2.send(null);
								xhr2.onload = function () {
									var img = new Image();

									img.src = URL.createObjectURL(xhr2.response);
									img.onload = function() {
										var b64String = cvs.toDataURL("image/png");
										var loc = b64String.search("base64,");

										resolve({
											str: b64String.slice(loc + 7, b64String.length),
											img: img
										});
									};
								};
							});
					});
			});
		},
		event: function() {
			var OldEvStatus = T.EvStatus;

			var xhr = new XMLHttpRequest();

			if (xhr) {
				xhr.open("GET", T.baseUri + "EventStatus", true);
				xhr.onload = function () {
					T.EvStatus = xhr.responseText;

					//noinspection JSBitwiseOperatorUsage
					if ((OldEvStatus & 0x01) && (T.EvStatus & 0x02)) {
						if (T.onSigPenDown)
							T.onSigPenDown();
					}

					//noinspection JSBitwiseOperatorUsage
					if ((OldEvStatus & 0x02) && (T.EvStatus & 0x01)) {
						if (T.onSigPenUp)
							T.onSigPenUp();
					}
				};

				xhr.send(null);
			}
		},


		//helpers

		bind: function(func, arg){
			return function(){
				return T[func].apply(this, arg);
			};
		},
		bget: function(prop){
			return function(){
				return T.get(prop);
			};
		},
		bset: function(){
			return T.bind('set', Array.prototype.slice.call(arguments));
		}
	};


	var bind = T.bind
	,	bget  = T.bget
	,	bset  = T.bset;
	
})(jQuery);