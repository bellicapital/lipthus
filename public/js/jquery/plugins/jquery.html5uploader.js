(function ($) {

    $.fn.html5Uploader = function (options) {

        var crlf = '\r\n';
        var boundary = "iloveigloo";
        var dashes = "--";

        var o = {
            name: "uploadedFile",
            postUrl: "upload",
			onSelect: $.noop,
            onError: $.noop,
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
            if ($this.is("[type=\"file\"]")) {
                $this.bind("change", function () {
					var files = this.files;
					for (var i = 0; i < files.length; i++) {
					    fileHandler(files[i]);
					}
                });
            } else {
                $this.bind("dragenter dragover", function () {
					return false;
                }).bind("drop", function (e) {
					var files = e.originalEvent.dataTransfer.files;
					for (var i = 0; i < files.length; i++) {
					    fileHandler(files[i]);
					}
					return false;
                });
            }
        });
		
		function handleFiles(files){
			$.each(files, function(){
				fileHandler(this);
			});
		}

        function fileHandler(file) {
            var xmlHttpRequest = new XMLHttpRequest();
			
			if(window.FileReader){
				var fileReader = new FileReader();
				fileReader.onabort = function (e) {//l('fileReader.onabort', e);
					o.onClientAbort(e, file);
				};
				fileReader.onerror = function (e) {//l('fileReader.onerror', e);
					o.onClientError(e, file);
				};
				fileReader.onload = function (e) {//l('fileReader.onload', e,file);
					o.onClientLoad(e, file);
				};
				fileReader.onloadend = function (e) {//l('fileReader.onloadend', e,file);
					o.onClientLoadEnd(e, file);
				};
				fileReader.onloadstart = function (e) {//l('fileReader.onloadstart', e);
					o.onClientLoadStart(e, file);
				};
				fileReader.onprogress = function (e) {//l('fileReader.onprogress', e);
					o.onClientProgress(e, file);
				};
				fileReader.readAsDataURL(file);
			}

			o.onSelect(file, xmlHttpRequest);

			if(o.sizeLimit && o.sizeLimit < file.size){
				o.onError({type: 'File Size'}, file);
				return;
			}
			
            xmlHttpRequest.upload.onabort = function (e) {//l('xmlHttpRequest.upload.onabort', e);
				o.onServerAbort(e, file);
            };
            xmlHttpRequest.upload.onerror = function (e) {//l('xmlHttpRequest.upload.onerror', e);
				o.onError(e, file);
            };
            xmlHttpRequest.upload.onload = function (e) {//l('xmlHttpRequest.upload.onload', e);
				o.onServerLoad(e, file);
            };
            xmlHttpRequest.upload.onloadstart = function (e) {//l('xmlHttpRequest.upload.onloadstart', e);
				o.onServerLoadStart(e, file);
            };
            xmlHttpRequest.upload.onprogress = function (e) {//l('xmlHttpRequest.upload.onprogress', e);
				o.onServerProgress(e, file);
            };
            xmlHttpRequest.onreadystatechange = function (e) {
                if(this.readyState === 4 && this.status === 200)
					o.onComplete(e, file, this.responseText);
            };
            xmlHttpRequest.open("POST", o.postUrl, true);
			
			var formData = new FormData();

			formData.append(o.name, file);

			o.params.mtime = file.lastModifiedDate.getTime()/1000;

			$.each(o.params, function(k,v){
				v && formData.append(k,v);
			});
			
			xmlHttpRequest.send(formData);
        }

    };

})(jQuery);