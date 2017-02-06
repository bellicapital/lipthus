(function($){
	
	$.fn.framedHoverPoster = function(){
		return this.each(function(){
			var hover,
				data = {src: this.src, duration: $(this).attr('duration')},
				frame;
			
			$(this).hover(function(){
				hover = true,
				frame = 5;
				
				if(!data.id){
					var r = /^(.+)\/videos\/([^\/]+)/.exec(this.src);
					
					if(!r){
						data.id = $(this).attr('data-video-id');
						
						if(!data.id)
							data.error = 'Not a ecms video';
						else
							r = /^(.+\/\/[^\/]+)/.exec(this.src);
					} else
						data.id = r[2];
					
					if(!data.error)
						$.extend(data, {
							host: r[1],
							width: this.clientWidth,
							height: this.clientHeight
						});
				}
				
				if(data.error)
					return euca.debug && console.warn(data.error, this.src);
				
				loadFrame.call(this);
			},
			function(){
				hover = false;
				
				if(data)
					this.src = data.src;
			});
	
			function loadFrame(){
				var self = this,
					img = new Image(),
					now = Date.now();
				
				img.src = data.host + '/videos/' + data.id + '/f_' + frame + '_' + data.width + 'x' + data.height + 'k1.jpg';
				
				$(img).on('load', function(){
					if(!hover)
						return;
					
					self.src = img.src;
					
					frame += 5;
					
					if(data.duration && data.duration < frame)
						frame = 5;
					
					setTimeout(function(){
						loadFrame.call(self);
					}, Math.max(1000 - (Date.now() - now), 0));
				}).on('error', function(){
					if(data.duration)
						return;
					
					data.duration = frame - 1;
					
					frame = 5;
					
					loadFrame.call(self);
				});
			}
		});
	};
	
})(jQuery);