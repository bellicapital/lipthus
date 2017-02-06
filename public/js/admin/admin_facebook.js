/* global FB, euca */

(function($){

var FbApp = function(d){
	$.extend(this, d);
};

FbApp.prototype.login = function(cb, scope){
	var opt = {
		success: function(r){
			if(r.status !== 'connected')
				$.alert('Login error: ' + r.status);
			else
				cb.call(this, r);
		}
	};
	
	if(scope)
		opt.scope = scope;
	
	$.fb('login', opt);
};

FbApp.prototype.dialogResult = function(request, title){
	var me = this;
	
	var $d = $('<div style="max-width:800px;max-height:500px">' + $.lang('_FETCHING') + '</div>').dialog({
		title: title || request,
		open: function(){
			me.login(function(){
				FB.api(request, function(r){
					$d.css({display: 'inline-block', lineHeight: '1em', fontSize: '0.9em'}).renderObject(r);
				
					$d.dialog('destroy').appendTo('body').dialog({
						title: title || request,
						width: $d.width()
					});
				});
			});
		}
	});
};

$.fn.renderObject = function(o){
	var $t = $('<table/>').appendTo(this.empty()), $tr, $td;

	$.each(o, function(k,v){
		$tr = $('<tr><td><b>' + k + '</b></td></tr>').appendTo($t);
		$td = $('<td>' + v + '</td>').appendTo($tr);
		
		if($.isPlainObject(v))
			$td.renderObject(v);
	});
};

$.fn.adminFacebook = function(){
	var $me = this;
	
	$.aj('FbApp', 'getAll').done(addApps);

	$('<button/>').appendTo(this).button({
		text: false,
		icons: {primary: "ui-icon-plus"}
	}).click(function(){
		$.dialogForm({
			vars: {
				appId: {
					required: true
				},
				appSecret: {
					
				}
			},
			onSubmit: function(r){
				$.aj('FbApp', 'create', [r.appId, r.appSecret], 'post').done(addApps);
			}
		});
	});

	function addApps(data){
		if(!$.isArray(data))
			data = [data];
		
		$.each(data, function(){
			var app = new FbApp(this),
				_id = this._id,
				$t = $('<div style="min-width:400px"><h3><img src="' + this.icon_url + '"/> ' + this.name + '</h3><div><table/></div></div>')
					.panel({
						collapsible: false,
						controls: '<span class="ui-icon ui-icon-refresh"></span>'
					}).appendTo($me).find('table');
			
			$me.find('.ui-icon-refresh').click(function(){
				$.alert('To do');
			});
			
			var tokens = this.tokens,
				accounts = this.accounts;
			
			delete(this._id);
			delete(this.name);
			delete(this.icon_url);
			delete(this.tokens);
			delete(this.accounts);
			
			this.link = '<a href="' + this.link +'" target="_blank">' + this.link + '</a>';
			this.logo_url = '<a href="' + this.logo_url +'" target="_blank">' + this.logo_url + '</a>';
			
			$.each(this, function(k,v){
				$t.append('<tr><td class="formcaption">' + k + '</td><td>' + v + '</td></tr>');
			});
			
			
			//Accounts
			var $d = $t.parent();
			
			$('<h5 class="ui-widget-header">Accounts<span class="ui-icon ui-icon-plus" style="cursor:pointer;float:right"></span><span id="accountsStatus" style="float:right"></span></h5>')
				.appendTo($d).find('.ui-icon-plus').click(function(){
					var trigger = this;
					
					$('#accountsStatus').html('Loggin in ...');
					
					app.login(function(loginResponse){
						$('#accountsStatus').html('Getting user accounts ...');
						FB.api('/me/accounts', function(r){
							$('#accountsStatus').empty();

							var $d = $('<div/>').css('display', 'inline-block');

							$.each(r.data, function(){
								this.id = parseInt(this.id, 10);

								var account = this;

								//Short live token not needed
								delete(account.access_token);

								$('<div style="margin:20px 4px"/>').appendTo($d).renderObject(this);
								
								if(!accounts[this.id + '_' + loginResponse.authResponse.userID] && this.id !== app.id)
									$('<button>Add</button>').appendTo($d).button().click(function(){
										$d.dialog('destroy');
										$.aj('FB', 'getUserAccount', [account.id, $.fbUser.uid], 'post').done(addAccount);
									});
							});

							if(!$d.find('*').size())
								$d.html('No accounts found');

							$d.appendTo('body').dialog({
								title: 'Your accounts',
								width: $d.width()
							});
						});
					}, 'email,manage_pages,publish_actions,publish_stream,publish_checkins');
				});
			
			$.each(accounts, function(){addAccount(this);});
		
			function addAccount(a){
				$('<a href="' + a.id + '">' + a.id + '</a>').appendTo($d).click(function(e){
					e.preventDefault();
					app.dialogResult('/' + a.id);
				});
			}
			
			
			//Tokens
			$('<h5 class="ui-widget-header">Tokens</h5>').appendTo($d);
			
			var $tokensTable = $('<table><tr><th>User</th><th>Profile</th><th>Expires</th></tr>').appendTo($d);
			
			$.each(tokens, function(){
				$tokensTable.append('<tr>\
					<td>' + this.user_id + '</td>\n\
					<td>' + (this.profile_id || '') + '</td>\
					<td>' + (this.expires_at ? new Date(this.expires_at).toLocaleString() : 'Never') + '</td>\
				</tr>');
			});
		});
	}
	
	return this;
};

$.fn.fbUser = function(){
	var $me = this;
	
	if(!euca.fb.appId)
		return this;
	
	$.fb(function(){
		FB.getLoginStatus(function(r){
			$me.html('<div><b>Status</b>: ' + r.status + '</div>');

			if(r.status === "unknown")
				return;

			$.each(r.authResponse, function(k,v){
				$me.append('<div><b>' + k + '</b>: ' + v + '</div>');
			});

			if(r.status !== 'connected')
				return;

			$('<a href="#" style="margin-left:12px">Disconnect</a>').appendTo($me.find('div:first')).click(function(){
				FB.logout(function(r){l(r);});
			});

			FB.api('/me', function(r){
				delete(r.id);
				$me.append('<img src="http://graph.facebook.com/' + r.username + '/picture?type=square" width="50" height="50"/>');

				$.each(r, function(k,v){
					if(typeof(v) === 'object')
						v = JSON.stringify(v);

					$me.append('<div><b>' + k + '</b>: ' + v + '</div>');
				});
			});
		});
	});

	return this;
};

})(jQuery);