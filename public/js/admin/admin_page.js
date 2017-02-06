(function($){

$.fn.adminPage = function(p,li){
	var types = {
//		$.lang('CMS'),
//		$.lang('Dynamic'),
//		$.lang('Custom'),
//		$.lang('Unknown'),
		dir: $.lang('Directory'),
		file: $.lang('File')
	};
	var themes = {cms: 'cms'};
	$.each(euca.themes, function(){
		themes[this] = this;
	});
	var vars = {
		key: {
			formtype: 'label',
			caption: 'Key',
			value: '<a href="/' + p.key + '" target="' + p.key + '">' + p.key + '</a>'
		},
		type: {
			formtype: 'label',
			caption: $.lang('Type'),
			value: types[p.type] || p.type
		},
		menu: {
			formtype: 'yesno',
			datatype: 'boolean',
			caption: 'Incluir en el menú',
			value: p.menu ? 1 : 0
		},
		userLevel: {
			formtype: 'selector',
			datatype: 'int',
			caption: 'Nivel del usuario',
			value: p.userLevel,
			options: ['Todos', 'Inscritos', 'Administradores(2)', 'Administradores(3)', 'Administradores(4)', 'Administradores(5)']
		},
		theme: {
			formtype: 'selector',
			datatype: 'text',
			caption: 'Tema',
			value: p.theme || euca.theme,
			options: themes
		}
	};
	if(p.key !== 'admin'){
		var cache = /^A(\d+)$/.exec(p.expires);
		cache = cache ? parseInt(cache[1] / 60, 10) : 0;
		
		$.extend(vars, {
			title: {
				formtype: 'text',
				multilang: true,
				width: 220,
				caption: 'Título del menú',
				value: p.title
			},
			pageTitle: {
				multilang: true,
				formtype: 'text',
				width: 220,
				caption: 'Título de la página',
				value: p.pageTitle
			},
			metaKeywords: {
				multilang: true,
				formtype: 'textarea',
				rte: false,
				width: 220,
				caption: 'Meta keywords',
				value: p.metaKeywords
			},
			metaDescription: {
				multilang: true,
				formtype: 'textarea',
				rte: false,
				width: 220,
				caption: 'Meta description',
				value: p.metaDescription
			},
			sitemap: {
				formtype: 'yesno',
				datatype: 'boolean',
				caption: 'Incluir en el sitemap',
				value: p.sitemap ? 1 : 0
			},
			rss: {
				formtype: 'yesno',
				datatype: 'boolean',
				caption: 'Incluir en el RSS',
				value: p.rss ? 1 : 0
			},
			debugImgRef: {
				formtype: 'bdi',
				datatype: 'bdf',
				caption: 'Imagen de referencia',
				description: 'Para desarrollo',
				value: p.debugImgRef
			},
			cache: {
				formtype: 'text',
				width: 30,
				caption: 'Caché',
				description: 'En minutos',
				value: cache
			}
		});
		if(p.type === 5){//custom
			vars.content = {
				multilang: true,
				formtype: 'textarea',
				rte: true,
				modal: true,
				caption: $.lang('Content'),
				value: p.content || ''
			};
		}
	}
	var $form = $('<div style="width:auto;padding:10px"/>')
		.appendTo(this)
		.addClass('ui-widget-content ui-corner-all').iForm({
			vars: vars,
			onValueChange: function(n,v,c){
				var key = n,
					newMl;//tmp solution

				if(n === 'cache'){
					v = parseInt(v, 10);
					if(!v){
						c(false);
						return;
					}
					key = 'expires';
					v = 'A' + (60 * v);
				} else if(n.name)
					key = n.name + '.' + n.lang;
				else if(typeof(v) === 'object' && Object.keys(v).length === 1 && Object.keys(v)[0].length === 2){
					newMl = true;

					var langCode = Object.keys(v)[0];

					key += '.' + langCode;
					v = v[langCode];
				}

				$.ajax({
					data: {
						m: 'changeVar',
						s: 'pages',
						id: p.id,
						args: [key, v]
					},
					type: 'post',
					success: function(d){
						if(d){
							if(d.ok !== 1)
								p[n] = d;
							else if(newMl){
								p[n] = p[n] || {};
								p[n][langCode] = v;
							} else
								p[n] = v;
							c && c(!!d, p[n]);
						}
					}
				});
			}
		});

	var $me = $(this);

	$('<button style="margin:0 auto">' + $.lang('_DELETE') + '</button>').appendTo($form.append('<hr/>')).button({
		icons: {
			primary: 'ui-icon-trash'
		}
	}).click(function(){
		$.ajax({
			type: 'post',
			data: {method: 'removeItem', args: ['pages', p.id]}
		}).done(function(d){
			if(d === true){
				$me.slideUp(function(){$me.remove();});
				li && $(li).remove();
			}
		});
	});

	return this;
};

$.fn.createPage = function(){
	// Crear nueva página dinámicamente
	this.width(400).append('<h3>Crear nueva página dinámicamente</h3>').highlighted();
	$('<form>Key: <input name="key"/><input type="submit" value="' + $.lang('_SUBMIT') + '"/><br/><br/><div></div></form>').appendTo(this).submit(function(){
		var $msg = $(this).find('div:last').empty();
		var key = $.trim($(this).find('input[name="key"]').val());
		$('#adm_pages').find('li:has(span)').each(function(){
			if(key === $(this).text())
				$msg.html('Error: key already exists!').error();
		});
		if($msg.text())
			return false;

		$.ajax({
			data: {
				classname: 'page',
				method: 'newCustomPage',
				args: [key]
			},
			type: 'post',
			success: function(d){
				if(d === true){
					location.hash = '#pages|' + key;
					$('#adm_pages').trigger('menuOpen');
				}
			}
		});
		return false;
	});
	return this;
};

})(jQuery);