/* global euca, google */

(function($){

$.fn.miscRSS = function(d){
	this.append('<h4>RSS definidos en themes/' + d.rss.theme
		+ '/info.php: <b>' + $.lang(d.rss.info ? '_YES' : '_NO') + '</b></h4>');
	$t = $('<table><tbody></tbody></table>').appendTo(this).find('tbody');
	$.each(d.rss.list, function (uri, title){
		$t.append('<tr><td>' + title + '</td>'
			+ '<td><a href="' + uri + '" target="_blank">' + uri + '</a></td>'
			+ '<td>| <a href="http://feed1.w3.org/check.cgi?url=' + encodeURIComponent(uri) + '">Validar</a></td>'
			+ '</tr>');
	});
	return this;
};
$.fn.miscRobots = function(d){
	return this.append('<pre>' + d.robots + '</pre>');
};

$.fn.miscSitemap = function(d){
	var $me = this, robots = [], re = /Sitemap:.+/gm, yesno = $.lang(d.sitemap && d.sitemap.info ? '_YES' : '_NO');
	if(re.test(d.robots))
		robots = d.robots.match(re);
	this.append('<h4>Sitemap definido en themes/' + d.rss.theme + '/info.php: <b>' + yesno + '</b></h4>')
		.append('<p><b>Definidos en robots.txt: ' + robots.length + '</b></p>');
	$.each(robots, function(){
		$me.append('<div>' + this.substr(9) + '</div>');
	});
	$.ajax({
		url: 'sitemap.xml',
		dataType: 'xml',
		success: function(s){
			$me.append('<br/><p><b>Contenido de sitemap.xml:</b></p>');

			var $t = $('<table class="outer"><thead><th>loc</th><th>lastmod</th></thead><tbody></tbody></table>')
				.appendTo($me).find('tbody');

			$(s).find("sitemap,url").each(function(){
				var loc = $(this).find('loc').text();

				$t.append('<tr>\
					<td><a href="' + loc + '" target="_blank">' + loc + '</a></td>\
					<td>' + ($('lastmod', this).text() || '&nbsp;') + '</td></tr>');
			});
		}
	});
	return this;
};

// TODO: mover a logs
$.fn.miscTranslations = function(){
	var $me = $(this);

	$.ajax({
		data: {
			s: 'loggerTranslator',
			m: 'getReport'
		}
	}).done(function(d){
		$me.append('<h3>Nº de caracteres traducidos:</h3>');
		
		$.each(d, function(k){
			$me.append('<div>' + k + ': ' + this + '</div>');
		});
	});
};

$.fn.miscMultilang = function(){
	$(this).append('<h3>Available langs</h3>');
	
	var $ul = $('<ul>').appendTo(this);
	
	$.each(euca.translatorLangs, function(code, name){
		$ul.append('<li><label><input name="' + code + '" type="checkbox"' + (euca.langNames[code] ? ' checked' : '') + '>' + code + ': ' + name + '</label></li>');
	});
	
	$ul.find('input').change(function(){
		$.ajax({
			data: {
				cl: 'admin',
				m: 'filterLang',
				a: [this.name, this.checked]
			}
		}).done(function(d){
			if(d.error)
				$.alert(d.error);
		});
	});
};

$.fn.miscCheckObjects = function(){
	var $me = this,
		total = 0,
		$do = $('<div style="width:400px;min-height:60px;font-size:0.9em;padding:10px;" class="ui-widget-content ui-corner-all loading32"></div>').appendTo(this);
	$.ajax({
		data: {method: 'checkObjects', classname: 'dynobjects'},
		type: 'post',
		success: function(d){
			var $summary = $('<div style="float:left;text-align:right;padding:8px;" class="ui-widget-content ui-corner-all ui-state-highlight"></div>').appendTo($do),
				$counts = $('<div style="float:left;text-align:right;padding:8px;margin:0 8px;" class="ui-widget-content ui-corner-all ui-state-highlight"></div>').appendTo($do);

			$do.removeClass('loading32');

			$.each(d.summary, function(k){
				$summary.append('<div>' + k + ': ' + this + '</div>');
				total += this;
			});
			$.each(d.counts.dynobjects, function(k){
				$counts.append('<div>' + k + ': ' + this + '</div>');
			});
			$counts.append('<hr/>');

			var totalFiles = 0;

			$.each(d.counts.files, function(folder, count){
				totalFiles += count;
				$counts.append('<div>Files ' + folder + ': ' + count + '</div>');
			});

			$counts.append('<div>Total files : ' + totalFiles + '</div>');

			$counts.append('<hr/>');
			$counts.append('<div>Users: ' + d.counts.users + '</div>');
			$counts.append('<div>Comments: ' + d.counts.comments + '</div>');

			$do.append('<br style="clear:both;"/>');
			if(total) {
				$('<button style="float:right">Repair</button>').prependTo($do).button().click(function(){
					$.ajax({
						data: {method: 'checkObjects', classname: 'dynobjects', args: [true]},
						type: 'post',
						success: function(){
							$me.empty().miscCheckObjects();
						}
					});
				});
				$do.append('<hr style="margin:12px 0"/>');

				$.each(d.missing, function(t){
					$do.append('<h4>Missing ' + t + '</h4>');
					$.each(this, function(colname){
						var $coldiv = $('<div class="ui-widget-content"><h5>' + colname + '</h5></div>').appendTo($do);
						var $ul = $('<ul></ul>').appendTo($coldiv).css({
							listStyle: 'square inside',
							fontSize: '0.9em',
							paddingLeft: '12px'
						});
						$.each(this,function(idtitle){
							var $ul2 = $('<li>' + idtitle + '<ul></ul></li>')
								.appendTo($ul)
								.find('ul')
								.css({
									paddingLeft: '30px',
									listStyle: 'disc inside',
									fontSize: '0.9em'
								});
							if($.isPlainObject(this))
								$.each(this, function(refcol){
									var $ul3 = $('<li>' + refcol + '<ul></ul></li>')
									.appendTo($ul2)
									.find('ul')
									.css({
										paddingLeft: '20px',
										listStyle: 'decimal inside',
										fontSize: '0.9em'
									});
									$.each(this, function(){
										$ul3.append('<li>' + this + '</li>');
									});
								});
							else
								$('<li>' + this + '</li>')
									.appendTo($ul2);
						});
					});
				});

				$.each(d.orphan, function(t){
					$do.append('<h4>Orphan ' + t + '</h4>');
					var $coldiv = $('<ul class="ui-widget-content" style="list-style: disc inside"></ul>').appendTo($do);
					$.each(this, function(id, fn){
						var href = t === 'images' ? '/fs/images/' + id + '/' + fn : '';
						//noinspection HtmlUnknownTarget
						$coldiv.append('<li><a target="_blank" href="' + euca.staticUrl + '/fs/' + id + '/' + fn + '">' + id + ' - ' + fn + '</a></li>');
					});
				});

				$do.find('.ui-widget-content').css({padding: '4px 8px'});
			}
		}
	});
	return this;
};

$.fn.miscCache = function(){
	var $me = this.attr('id', 'lastMiscCache');

	$.ajax({
		data: {method: 'allCacheInfo', classname: 'cache'},
		success: function(d){
			if($.count(d.tags)){
				var $cacheForm = $('<form style="float:left"></form>').appendTo($me).submit(function(e){
					e.preventDefault();
					e.stopImmediatePropagation();
					var data = {classname: 'cache', method: 'clear', args: [[]]};
					$cacheForm.find(':checkbox').each(function(){
						this.checked && data.args[0].push(this.value);
					});
					data.args.length && $.ajax({
						data: data,
						type: 'post',
						success: function(){
							$me.empty().miscCache();
						}
					});
				});

				var $cacheList = $('<div style="float:left"/>').appendTo($me);

				$me.append('<br style="clear:both"/>');

				var $t = $('<table/>').appendTo($cacheForm);
				var total = 0;

				$.each(d.tags, function(tag, count){
					$t.append(
						'<tr><td><input type="checkbox" name="caches" value="' + tag + '"/></td><td>'
							+ tag + ' (' + count + ')' + '</td><td><span class="ui-icon ui-icon-triangle-1-e"></span></td></tr>'
					);
					total += count;
				});

				$('[href="admin#misc|Cache"] span').html(' (' + total + ')');

				$t.find(":checkbox")
					//.checkbox()
					.click(function(){$(this).blur();});

				$t.find('span.ui-icon-triangle-1-e').click(function(){
					$cacheList.empty();

					$t.find('>tbody>tr').removeClass('ui-state-active');

					var $row = $(this).parents('tr:first').addClass('ui-state-active');

					$.ajax({
						data: {
							method: 'getList',
							classname: 'cache',
							args: [$row.find('input')[0].value]
						},
						type: 'post'
					}).done(function(d2){
						var $tlist = $('<table class="outer ui-widget ui-state-highlight"/>').appendTo($cacheList);

						$.each(d2, function(id, f){
							//noinspection HtmlUnknownTarget
							$tlist.append('<tr data-id="' + id + '"><td><a href="' + euca.staticUrl + '/c/' + id + '/' + f.name + '" target="_blank">' + f.name + '</a></td>\n\
								<td>' + $.humanizeSize(f.size) + '</td><td>' + f.mtime + '</td>\n\
								<td><span class="ui-icon ui-icon-trash"></span></td></tr>');
						});
				
						$tlist.find('span.ui-icon-trash').click(function(){
							var $tr = $(this).parents('tr:first');
							$.aj('cache', 'remove', [$tr.attr('data-id')], function(){$tr.remove();}, 'post');
						});
					});
				});

				$('<input type="submit" value="Vaciar cache"/>').appendTo($cacheForm).button();
			} else
				$me.append('<h4><i>La cache está vacía</i></h4>');
		}
	});
	return this;
};

$.fn.miscPayments = function(){
	var $me = this;

	$.ajax({
		data: {classname: 'Payment', method: 'getFulllist'}
	}).done(function(d){
		var $t = $('<table class="tablesorter"><thead><tr><th>'
			+ $.lang('_DATE') + '</th><th>'
			+ $.lang('_NAME') + '</th><th>Type</th><th>Status</th><th>Pay system</th><th>Total</th><th></th></tr></thead><tbody></tbody></table>')
			.appendTo($me);
		
		$.each(d, function(id, misc){
			misc.id = id;

			if(misc.status == 'approved')
				misc.status = '<span style="color:green">' + misc.status + '</span>';
			
			$('<tr id="' + id + '" class="ui-state-default"><td>' + this.created + '</td><td>'
				+ (this.uid ? '<a href="/user?id='+ this.uid + '">' + this.name + '</a>' : this.name) + '</td><td>'
				+ this.type + '</td><td>'
				+ misc.status + '</td><td>'
				+ this.paytype + '</td><td style="text-align:right">'
				+ this.total + '</td><td>'
				+ '<span class="ui-icon ui-icon-info"></span><a class="ui-icon ui-icon-link" href="/payments/' + misc.id + '"></a><span class="ui-icon ui-icon-pencil"></span><span class="ui-icon ui-icon-trash"></span></td></tr>'
			).appendTo($t).data('payment', misc);
		});
		
		$t.tablesorter({
			headers: {0: {sorter: 'shortDate'}, 6: {sorter: false}},
			widgets: ['jqueryui'],
			//dateFormat: "dd/mm/yy"
			dateFormat: 'es'
		});
		
		$t.find('.ui-icon').css({cursor: 'pointer', float: 'left'});
		
		$t.find('.ui-icon-info').click(function(){
			$.ajax({
				data: {
					classname: 'payment',
					method: 'summary',
					id: $(this).parents('tr:first').data('payment').id
				}
			}).done(function(d){
				$(d).dialog({width: 680, modal: true});
			});
		});
		
		$t.find('.ui-icon-pencil').click(function(e){
			e.stopPropagation();
			var id = $(this).parents('tr:first').data('payment').id;
			var item = Item.get('payment', id);
			item.showForm();
		});
		
		$t.find('.ui-icon-trash').click(function(e){
			e.stopPropagation();
			var $tr = $(this).parents('tr:first').addClass('ui-state-active'),
				payment = $tr.data('payment'),
				id =payment.id;
			
			if(confirm("¿Eliminar este pago de" + payment.name + "?\nNo se puede deshacer.")){
				$.ajax({
					data: {
						method: 'remove',
						id: id,
						handler: 'payment'
					},
					type: 'POST'
				}).done(function(d){
					if(d === true)
						$tr.slideUp();
					else
						$tr.removeClass('ui-state-active');
				});
			}
		});
	});
};


})(jQuery);