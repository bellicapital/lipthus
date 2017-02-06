/* global euca */

(function ($) {

    $.fn.html5Uploader = function (options) {

        var crlf = '\r\n';
        var boundary = "iloveigloo";
        var dashes = "--";

        var o = {
            name: "file",
            postUrl: "//" + (euca.server || location.host) + "/upload",
			onSelect: $.noop,
            onError: $.noop,
            onClientAbort: $.noop,
            onClientError: $.noop,
            onClientLoad: $.noop,
            onClientLoadEnd: $.noop,
            onClientLoadStart: $.noop,
            onClientProgress: $.noop,
            onServerLoad: $.noop,
            onServerLoadStart: $.noop,
            onServerProgress: $.noop,
            onComplete: $.noop,
			params: {}
        };

        if (options)
            $.extend(o, options);

        return this.each(function (options) {
            var $this = $(this);
					
			var p = $.extend(null, o.params),
				files = this.files;

			$.each(this.attributes, function(){
				var a = /^data-param-(.+)$/.exec(this.name);

				if(!a)
					return;

				p[a[1]] = this.value;
			});

            if ($this.is('[type="file"]')) {
				if(!p.field)
					p.field = this.name;
				
                $this.bind("change", function (e) {
					e.stopPropagation();
					e.preventDefault();
					handleFiles(this.files, p, $this.get(0));
                });
            } else {
                $this.bind("dragenter dragover", function () {
					return false;
                }).bind("drop", function (e) {
					handleFiles(e.originalEvent.dataTransfer.files, p, $this.get(0));
					return false;
                });
            }
        });
		
		function handleFiles(files, p, c){
			$.each(files, function(){
				fileHandler(this, p, c);
			});
		}

        function fileHandler(file, p, c) {
            var xhr = new XMLHttpRequest();
			
			xhr.withCredentials = true;
			
			if(window.FileReader){
				var fileReader = new FileReader();
				fileReader.onabort = function (e) {l('fileReader.onabort', e);
					o.onClientAbort.call(c, e, file);
				};
				fileReader.onerror = function (e) {l('fileReader.onerror', e);
					o.onClientError.call(c, e, file);
				};
				fileReader.onload = function (e) {l('fileReader.onload', e,file);
					o.onClientLoad.call(c, e, file);
				};
				fileReader.onloadend = function (e) {l('fileReader.onloadend', e,file);
					o.onClientLoadEnd.call(c, e, file);
				};
				fileReader.onloadstart = function (e) {l('fileReader.onloadstart', e);
					o.onClientLoadStart.call(c, e, file);
				};
				fileReader.onprogress = function (e) {l('fileReader.onprogress', e);
					o.onClientProgress.call(c, e, file);
				};
				fileReader.readAsDataURL(file);
			}

			o.onSelect(file, xhr);

			if(o.sizeLimit && o.sizeLimit < file.size){
				o.onError({type: 'File Size'}, file);
				return;
			}
			
            xhr.upload.onabort = function (e) {l('xmlHttpRequest.upload.onabort', e);
				o.onServerAbort.call(c, e, file);
            };
            xhr.upload.onerror = function (e) {l('xmlHttpRequest.upload.onerror', e);
				o.onError.call(c, e, file);
            };
            xhr.upload.onload = function (e) {l('xmlHttpRequest.upload.onload', e);
				o.onServerLoad.call(c, e, file);
            };
            xhr.upload.onloadstart = function (e) {l('xmlHttpRequest.upload.onloadstart', e);
				o.onServerLoadStart.call(c, e, file);
            };
            xhr.upload.onprogress = function (e) {l('xmlHttpRequest.upload.onprogress', e);
				o.onServerProgress.call(c, e, file);
            };
            xhr.onreadystatechange = function (e) {
                if(this.readyState === 4 && this.status === 200){
					o.onComplete.call(c, e, file, JSON.parse(this.responseText));
					l('upload complete', this.responseText);
				}
            };
            xhr.open("POST", o.postUrl, true);
			
			var formData = new FormData();

			formData.append(o.name, file);
			formData.append('mtime', file.lastModifiedDate.getTime());

			$.each(p, function(k,v){
				v && formData.append(k,v);
			});
			
			xhr.send(formData);
        }

    };

})(jQuery);