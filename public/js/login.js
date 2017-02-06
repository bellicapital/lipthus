/* global euca, FB */

(function($){


$.login = function (options){
	var o = $.extend({
		subtitle: $.lang('noRegclickH'),
		error: $.noop
	}, options || {});

	var $form = $('#useraccess');

	if($form.size()){
		$form.dialog('open');
		return;
	}

	$form = $('<div id="useraccess">').appendTo('body').html(
		'<div id="useraccessmsg"></div>\
		<form action="javascript:;">\
			<table>\
				<tr><td>'+$.lang('Name')+'|'+$.lang('Email')+'&nbsp;</td><td align="left"><input type="text" name="uname" size="12" value="" maxlength="25" /></td></tr>\
				<tr><td align="right">'+$.lang('Password')+'&nbsp;</td><td align="left"><input type="password" name="pass" size="12" maxlength="32" /></td></tr>\
				<tr><td colspan="2"><label><input type="checkbox" name="rememberme" value="On" checked="checked"/> '+$.lang('rememberPC')+'</label></td></tr>\
				<tr><td colspan="2"><input type="submit" value="'+$.lang('Access')+'" style="margin: 10px;" /></td></tr>\
			</table>\
		</form>')
		.dialog($.extend({title: 'Acceso'}, {
			modal: true,
			open: function(){$(this).find('form input:first').focus();}
		}))
		.find('form:first');

	if(euca.allow_register){
		$('<a href="#">' + o.subtitle + '</a>').appendTo('#useraccess').click(function(){
			$form.parent().dialog('close');
			$('#registerAccess').click();
			return false;
		});
	}

	if(euca.fb && $.fn.fb)
		$form.find('td:last').fb('login-button');

	$form.submit(function(){
		var uname = $(':input[name=uname]', this),
			pass = $(':input[name=pass]', this);
		if(!uname.val()){
			$.alert('Escribe un nombre de usuario');
			uname.focus();
			return false;
		}
		if(!pass.val()){
			$.alert('Escribe una contraseña');
			pass.focus();
			return false;
		}

		$.ajax({
			url: '/ajaxlogin',
			data: {
				username: uname.val(),
				password: pass.val(),
				rememberme: $('input:checkbox:checked', $form).size()
			},
			type: 'POST',
			success: function(d){
				if(d.id){
					$.loginUser(d);
					$form.parent().dialog('close');
				} else {
					msg(d);
					o.error(d);
					uname.select();
				}
			},
			error: function(d){
				$form.parent().html(d.responseText);
			}
		});
		return false;
	});

	$('#useraccessmsg').html(o.msg || '');
};


$.fn.register = function(options){
	var o = $.extend({
		title: '',
		framed: true,
		onOpen: $.noop,
		success: $.noop
	}, options);

	return this.load('/dom?method=registerForm', function(){
		$.endLoadingMsg();//load no dispara ajax.complete ???

		var content = this,
			$form = $(content).find('form');

		if($form.length){
			$form.removeAttr('onsubmit').submit(function(){
				if(!eval('FormValidate_' + this.id + '()'))
					return false;

				var values = {};
				$.each($(this).serializeArray(), function(){
					values[this.name] = this.value;
				});

				$.ajax({
					data: {
						classname: 'User',
						method: 'register',
						args: [values],
						EUCA_TOKEN: values.EUCA_TOKEN
					},
					type: 'POST',
					dataType: 'json',
					success: function(d){
						if(d.error){
							o.onError.call(content, d.error);
						}
						d.ok && o.success.call(content, d);
					}
				});
				return false;
			}).find('input:first').focus();

			$form.parent()._resize();
		}
		o.onOpen.call(content);
	});
};
$.loginUser = function(u){
	if(euca.user && euca.user.id === u.id)
		return;

	var oldUser = euca.user;

	euca.user = u;

	$(window).trigger('userLogged', [u]).trigger('userChange', [{before: oldUser, user: u}]);
};

$.logoutUser = function(){
	$(window).trigger('userLoggedOut');
	window.location.href = '/logout';
};

$(window).bind('onFbLogin', function(e, fbuid){
	if(euca.user && euca.user.fbid === fbuid && location.pathname !== '/login')
		return;

	FB.getLoginStatus(function(r){
		if(!r.status === "connected")
			return;

		$.loading();
		$.loadingMsg();

		$.ajax({
			url: '/fbajaxlogin',
			data: {access_token: r.authResponse.accessToken},
			type: 'POST',
			success: function(d){
				$.endLoadingMsg();
				$.endLoading();

				if(d.id){
					if(location.pathname === '/login'){
						location.href = location.search.replace(/^\?.*referer=([^\&]+).*$/, '$1') || '/';
						return;
					}

					$.loginUser(d);

					$('#useraccess').dialog('close');//Access dialog
					$('#userinfo').parent().dialog('close');//Register dialog
				}
			}
		});
	});
});

$(window).bind('onFbLogout', function(){
	$.ajax({
		data: {
			classname: 'user',
			method: 'facebookLogout'
		},
		type: 'POST'
	});
});

})(window.jQuery);