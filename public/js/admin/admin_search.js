$.fn.adminSearch = function(){
	return this.width(700).each(function(){
		var $me = $(this), $result = $('<div/>').appendTo(this);
		$('<form></form>').width(300).prependTo(this).form({
			vars: {
				value: {
					formtype: 'text',
					caption: '<div style="text-align:left"><input type="radio" name="type" value="_id"/> id<br/><input type="radio" name="type" value="global" checked/>Global</div>'
				}
			},
			showCancelButton: false,
			title: 'DB Search',
			onSubmit: function(data){
				if(!data.value)
					return;
				
				$result.empty();
				$.ajax({
					data: {method: 'search', args: data},
					success: function(d){
						if(($.isPlainObject(d) && !Object.keys(d).length) || d.length === 0)
							$result.append('No encontrado');
						var $t;
						if(data.type == '_id'){
							if(!d.colname)
								return;
							$result.append('<h3>Colname: ' + d.colname + '</h3>');
							if(d.model == 'dynobject' && $.H.handlers[d.colname]){
								var it = new Item($.H.handlers[d.colname]);
								it.setVars(d.object);
								it.loaded = true;
								it.showForm({
									container: $('<div>').appendTo($result)
								});
							} else {
								$t = $('<table/>').appendTo($result);

								$.each(d.object, function(k,v){
									if(k == 'created')
										v = new Date(v*1000).toLocaleDateString();
									else if(d.model == 'dynobject' && $.H.handlers[d.colname]){
										switch($.H.handlers[d.colname].vars[k].data_type){

										}
									}
									$t.append('<tr><td class="formcaption">' + k + '</td><td>' + v + '</td></tr>');
								});
							}
						} else {
							$t = $('<table class="tablesorter" style="text-align:center"><thead><tr><th>Colname</th><th>id</th><th>' + euca._lang._TITLE + '</th><th>' + euca._lang._DESCRIPTION + '</th></tr></thead><tbody></tbody></table>')
								.appendTo($result);
							var $tbody = $t.find('tbody');
							$.each(d, function(col, r){
								$.each(r, function(id, f){
									$tbody.append('<tr><td>' + col + '</td><td>' + id + '</td><td>' + f.title + '</td><td>' + f.description + '</td></tr>');
								});
							});
							$t.tablesorter();
						}
					}
				});
			},
			cssUi: true
		});
	});
};