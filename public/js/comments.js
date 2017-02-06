/* global euca */

$.fn.comments = function(options){
	var o;

	if(typeof(options) === 'string'){
		o = this.data('comments');
		
		var $me = this;
		
		switch(options){
			case 'newComment':
				var $r = $me.find('.newComment');
			
				if($r.size())
					return $r.show().find('textarea');
				
				$r = $('<div class="newComment">').appendTo(this);

				function checkPostAllowed(){
					if(!euca.anonpost && !euca.user){
						$.login({msg: '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span>' + $.lang('envioCommReg')});
						return false;
					}
					return true;
				}
				
				var $ta = $('<textarea placeholder="' + o.writeHere + '"></textarea>')
					.appendTo($r)
					.focus(checkPostAllowed);
				
				$r.append('<br/><br/>');
				
				var $name;
				
				if(euca.anonpost && !euca.uid){
					$name = $('<input name="name" value="' + (euca.user ? euca.user.name : '') + '" placeholder="' + $.lang('Name') + '" style="margin-right: 12px; width:212px"/>').appendTo($r);
				}
				
				$('<input type="submit" class="submitComment" value="'+$.lang('_SUBMIT')+'" style="padding: 2px 10px; margin: 4px;"/>')
						.appendTo($r).button({inline: true}).click(function(){
					if(!checkPostAllowed())
						return;

					if(!$ta.val() || $ta.val() === o.writeHere){
						$.alert($.lang('commPlease'));
						$ta.select();
						return;
					}
					if($name && !$name.val()){
						$.alert($.lang('namePlease'));
						return;
					}

					var data = {
						m: 'submit',
						schema: 'comment',
						req: true,
						a: [$ta.val(), o.dbname, o.colname, o.itemid, $name ? $name.val() : (euca.user ? euca.user.name : '')]
					};

					$.ajax({
						data: data,
						type: 'POST',
						success: function(d){
							$r.html('<br/>');
							$me.find('#nocomments').hide();
							var $link = $('<a href="javascript:;">'+$.lang('graciasComm')+'</a>').appendTo($('<div>').appendTo($r));
							if(d.active){
								var $newComment = $(d.html).insertAfter($me.find('.commentsTitle'));
							
								$link.click(function(){
									$('html').animate({scrollTop: $newComment.offset().top - 90});
									$link.appendTo($newComment);
									$newComment.effect('pulsate');
								});
								setTimeout(function(){$link.click();}, 2000);
							} else if(d.error)
								$r.append('<div style="font-size:1.5em; text-align:center">Tu comentario no ha podido ser publicado</div>');
							else
								$r.append('<div style="font-size:1.5em; text-align:center">Tu comentario será publicado una vez aprobado</div>');
							$me.resize();
						}
					});
				});
				break;
		}
		return this;
	} else {
		return this.each(function(){
			var $me = $(this);
			
			if($me.data('comments'))
				return this;

			o = $.extend({
				itemid: $me.attr('data-itemid'),
				colname: $me.attr('data-colname'),
				dbname: $me.attr('data-dbname'),
				writeHere: $.lang('_CM_WRITE_HERE')
			}, options);

			$me.data('comments', o);

			$me.comments('newComment');
			$me.append('<br style="clear:both; line-height: 0;"/>');
		});
	}
};

$.contentReady(function(){$('.comments').comments();});