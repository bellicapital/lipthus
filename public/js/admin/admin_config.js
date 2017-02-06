(function($){
"use strict";

$.fn.adminConfig = function(group_name){
	var $me = this;
	$.timeZoneList();

	$.ajax({
		data: {cl: 'admin', m: 'getGroupConfigs4Edit', a: [group_name]},
		success: function(d){
			if(group_name === 'facebook')
				return $me.adminFacebook(d.configs);

			var configs = {};

			$.each(d.configs, function(k){
				if(!this.formtype)
					this.formtype = 'textbox';

				switch(this.formtype){
					case 'timezone':
						this.options = $.tz;
						this.formtype = 'selector';
						break;
					case 'bdi':
						$.extend(this, {
							colname: 'config',
							type: 'bdi',
							field: 'value'
						});
						break;
					case 'urls':
						$('<div class="ui-widget-content ui-corner-all"></div>').appendTo($me).urls(this);
						return;
					case 'pay':
						$('<div class="ui-widget-content ui-corner-all"></div>').appendTo($me).payConfig(this);
						return;
					case 'sms':
						$('<div class="ui-widget-content ui-corner-all"></div>').appendTo($me).smsConfig(this);
						return;
					case 'watermark':
						$('<div></div>').appendTo($me).formWatermark({
							title: this.caption,
							colname: 'config',
							itemid: this.id,
							name: 'value',
							value: this.value
						});

						if(Object.keys(d.configs).length > 1)
							$me.append('<hr/>');
						return;
					case 'textarea':
						break;
					case 'text':
					case 'textbox':
						this.width = 260;
				}

				configs[k] = this;
			});

			$me.iForm({
				vars: configs,
				/**
				 * Procesa el campo modificado
				 *
				 * @param k string config name
				 * @param v mixed  config value
				 * @param c function callback(bool success)
				 */
				onValueChange: onValueChange
			});

			if(group_name !== 'custom')
				return;

			$('<button/>').appendTo($me).button({
				icons: {primary: 'ui-icon-plus'}
			}).click(function(e){
				e.preventDefault();

				$.dialogForm({
					title: 'New Custom Config',
					vars: {
						name: {required: true},
						title: {},
						value: {},
						datatype: {
							formtype: 'selector',
							value: 'string',
							options: [
								'string',
								'int',
								'obj',
								'float',
								'bool',
								'selector',
								'watermark',
								'multilang',
								'page',
								'lang',
								'bdf'
							]
						},
						formtype: {
							formtype: 'selector',
							value: 'text',
							options: [
								'text',
								'selector'
							]
						}
					},
					onSubmit: function(data){
						var $d = $(this);
						$.aj('ConfigCollection', 'createCustomConfig', [data], 'post').done(function(ret){
							$d.parent().dialog('destroy');
						});
					}
				});
			});
		}
	});

	function onValueChange(k, v, c){
		$.ajax({
			data: {
				s: 'config',
				m: 'changeValue',
				a:[k, v]
			},
			type: 'post'
		}).done(function(ret){
			c && c(true, ret);
			if(k === 'sitelogo'){
				$('#sitelogo').attr('src', ret.filePath + '?w=340&h=48').load(function(){
					$(this).height(this.naturalHeight).width(this.naturalWidth);
				});
			}
		});
	}
	return this;
};

$.fn.payConfig = function(c){
	var v = $.isPlainObject(c.value) ? c.value : {}
	,	$me = this.width(376).append('<h3>' + c.caption + '</h3>');

	$me.find('h3').disableSelection();

	$.ajax({
		data: {
			cl: 'shopping/shoppayparams',
			m: 'getFormVars'
		},
		success: function(vars){
			$('<div></div>').appendTo($me).iForm({
				vars: vars,
				onValueChange: function (name, val, callback){
					v[name] = val;
					$.ajax({
						data: {
							m: 'changeSubValue',
							s: 'config',
							a: ['pay', name, val]
						},
						type: 'POST',
						success: function(ret){
							callback && callback(!!ret.ok);
						}
					});
				}
			});
			$me.panel({
				collapsed: !v.active
			});
		}
	});

	return this;
};

})(jQuery);