/**
 * Created by jj on 11/10/16.
 */

(function($){

	$.fn.userNav = function(options){
		var o = $.extend({
			title: '',
			subtitle: $.lang('noRegclickH'),
			success: $.noop,
			error: $.noop
		}, options);

		var $me = this;

		$(window).one('userLogged', function(){
			var html = '<ul><li><a href="#">', u = euca.user;

			html += '<img src="' + (u.picture || '/cms/img/silhouette.gif') + '" alt=""/>' + u.name + '</a><ul class="ui-menu-icons">';

			if(u.isAdmin)
				html +=	'<li class="ui-menu-item"><a href="/admin"><span class="ui-icon ui-icon-gear"></span>Admin</a></li>';

			html += '<li><a href="javascript:$.logoutUser()">'+$.lang('Exit')+'</a></li></ul></li></ul>';

			$me.html(html);

			var $ul = $me.find('ul.ui-menu-icons');

			if($.count(euca.langs) > 1){
				var $lul = $ul.prepend('<li><a href="#" id="menu-lang">\n\
					<span class="ui-icon ui-icon-flag"></span>Idioma</a><ul></ul></li>')
					.find('ul');

				$.each(euca.langs, function(code, name){
					$lul.append('<li><a href="?hl=' + code + '">'+name+'</a></li>');
				});

				$lul.find('li>a').click(function(e){
					e.preventDefault();
					location.search = $(this).attr('href');
				});
			}

			$.fn.menu && $me.find('ul:first').menu({
	//			position: {my: 'left+3 bottom'},
				icons: {submenu: "ui-icon-carat-1-s"}
			});//.removeClass('ui-menu-icons');
		});

		if(euca.user){
			$(window).trigger('userLogged');

			$(window).one('userLoggedOut', function(){

			});
			return this;
		}

		if(!o.title && location.pathname === '/admin')
			o.title = '<a href="javascript:;" id="userAccess">'+$.lang('access') + '</a>';

		if(o.title && $.fn.button)
			this.html(o.title).find('>*').button({
	//			icons: {primary: 'ui-icon-person'}
			});

		if($.fn.fb)
			this.fb('login-button').css({marginLeft: '8px', overflow: 'auto'});

		var $regForm;

		$('#userAccess').click($.login);

		$('#registerAccess').click(function(){
			if($regForm){
				$regForm.dialog('open');
			}
			else {
				var s = {
					title: $.lang('crearCuenta'),
					modal: true,
					open: function(){$(this).find('form input:first').focus();}
				};
				var $loading = $('<div class="loading_center"></div>').appendTo('body').dialog(s);
				$regForm = $('<div>').prependTo('body').register({
					onOpen: function(){
						$loading.dialog('destroy');
						$(this).dialog($.extend({width: 600}, s));
					},
					success: function(d){
						$(this).dialog('destroy');
						$('<div>' + d.ok + '</div>').appendTo('body').dialog(s);
						if(d.level){
							$.loginUser(d);
							o.success.call(d);
						}
					},
					onError: function(error){
						$(this).dialog('destroy');
						$.alert(error);
						//$('<div>' + error + '</div>').appendTo('body').dialog(s);
					}
				});
			}
		});

		return this;
	};

	$.jsLoaded(function(){
		$('.usernav').userNav();
	});

})(window.jQuery);