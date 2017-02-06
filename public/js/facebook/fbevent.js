$.fn.fbEventAttend = function(){
	if(!window.FB)
		return this;
	
	function changeAttendVal(event_id, val, callback){
		$.fb('login', {
			scope: 'rsvp_event',
			success: function(r){
				if(r.status != 'connected'){
					$.alert('Debes estar conectado con Facebook y conceder permisos');
					callback(false);
					return;
				}
				var rsvp_status = val;

				if(val == 'maybe')
					rsvp_status = 'unsure';

				FB.api('/' + event_id + '/' + val, 'post', function(r){
					// r puede ser true o una lista
					var st = false;

					if(r.data){
						$.each(r.data, function(){
							if(euca.user.fbid == this.id){
								if(this.rsvp_status == rsvp_status){
									st = true;
									return false;
								}
							}
							return true;
						});
					} else if(r === true)
						st = true;

					if(st){
						$.ajax({
							data: {
								classname: 'FbEvent',
								method: 'subscribeChanged',
								args: [event_id]
							}
						});
					}
					callback(st);
				});
			}
		});
	}
	
	return this.each(function(){
		var $me = $(this),
			uid = euca.user && euca.user.fbid;
		
		if($me.data('fbuser-id') === uid)
			return this;
		
		var id = $me.attr('data-event-id');
		
		$me.empty().data('fbuser-id', uid);
		
		if(uid){
			FB.getLoginStatus(function(r){
				FB.api('/' + id + '/invited/' + uid, function(r){
					if(r.data.length){
						var user_st = r.data[0].rsvp_status;
						drawStatus(user_st == 'unsure' ? 'maybe' : user_st);
					} else
						draw();
				});
			});
		} else
			draw();
		
		function drawStatus(user_st){
			$('<select class="uiButton" style="text-align:left">\n\
					<option value="attending">' + $.lang('FB_GOING') + '</option>\n\
					<option value="maybe">' + $.lang('FB_MAYBE') + '</option>\n\
					<option value="declined">' + $.lang('FB_NOT_GOING') + '</option>\n\
				</select>').appendTo($me).val([user_st]).change(function(){
					var $sel = $(this).blur();
					
					changeAttendVal(id, $(this).val(), function(r){
						r || $sel.val([user_st]);
					});
				});
			
			$me.append('<a class="uiButton" href="#">\
					<i class="fbCalendarInviteIcon img"></i>\
					<span class="uiButtonText">' + $.lang('FB_INVITE') + '</span>\
				</a>');
		}
		
		function draw(){
			$('<a class="uiButton" href="#">\
					<i class="fbCalendarJoinIcon img"></i>\
					<span class="uiButtonText">' + $.lang('FB_JOIN') + '</span>\
				</a>')
				.appendTo($me).click(function(){
					changeAttendVal(id, 'attending', function(r){
						if(r)
							$me.empty().fbEventAttend();
					});
					return false;
				}
			);
			$('<a class="uiButton" href="#">\
					<span class="uiButtonText">' + $.lang('FB_MAYBE') + '</span>\
				</a>')
				.appendTo($me).click(function(){
					changeAttendVal(id, 'matbe', function(r){
						if(r)
							$me.empty().fbEventAttend();
					});
					return false;
				}
			);
		}
	});
};

$.fn.fbEventInvited = function(){
	return this.each(function(){
		var $me = $(this);
		
		if($me.data('fb'))
			return;
		
		var id = $me.parents('[data-fb-event-id]:first').attr('data-fb-event-id');
		
		$me.data('fb', id);
		
		$.each(euca.fb[id], function(k,v){
			var title = k == 'attending' ? $.lang('FB_ATTENDING') : $.lang('FB_UNSURE');
			$me.append('<b>' + title + ' (' + $.count(v) + ')</b>');
			
			var $ul = $('<ul class="fb-uilist">').appendTo($me);
			
			$.each(v, function(uid, name){
				var ln = '<a href="//www.facebook.com/' + uid + '" target="_fb">';
				$ul.append('<li>'
						+ ln + '<img src="https://graph.facebook.com/' + uid + '/picture?type=square" alt=""/></a>'
						+ ln + name + '</a>'
					+ '</li>');
			});
		});
		
	});
};

$(window).bind('contentReady userLogged onFbStatusChange', function(){
	$('.fbEventGuests').fbEventInvited();
	$('.fb-event-attend').fbEventAttend();
});