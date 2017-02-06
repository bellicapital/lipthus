(function($){

/**
 * @param $c jQuery container
 * @param menu object
 * @param cb function callback
 */
function itemTree($c, menu, cb){
	var me = this;
	this.handler = $.H.handlers[menu.colname];
	this.$cnt = $c;
	this.menu = menu;
	this.languages = [];
	
	for(var i in euca.langs)
		this.languages.push(i);
	
	this.related = {};

	$.each(this.handler.allAcceptedRecursive(), function(){
		var colname = this.toString();
		if($.inArray(colname, menu.filter) === -1)
			me.related[colname] = $.H.handlers[colname];
	});

	/* asigna a valid_children los handlers creables en la raíz */
	var valid_children = [this.handler.colname];
	
	$.each(this.handler.accept, function(){
		if($.inArray(this.toString(), menu.filter) === -1){
			valid_children.push(this.toString());
		}
	});
	
	this.related[this.handler.colname] = this.handler;
	
	$.jstree._themes = euca.staticUrl + '/jquery/plugins/jstree/themes/';
	
	var types = {};
	
	$.each(this.related, function(d,h){
		var accept = h && h.accept.length;
		types[d] = {
			max_depth: accept ? -1 : 0,
			max_children: accept ? -1 : 0,
			valid_children: accept ? h.acceptKeys() : "none"
		};
//		if(!h.accept.length)
//			types[d].icon = {image: $.jstree._themes + 'default/file.png'};
//		else if(h == this.handler)
//			types[d].icon = {image: $.jstree._themes + 'default/drive.png'};
	});
	
	$('<table><tr><td><div class="itemtree ui-widget-content ui-corner-all">\
		<div id="treeaccions" style="font-size:10px" data-role="controlgroup" data-type="horizontal" data-mini="true"></div><hr/>\
		<div id="tree_' + this.handler.colname + '" class="itemtree ui-widget"></div></div></td>\
		<td><div id="details_' + this.handler.colname + '"></div></td></tr></table>').appendTo(this.$cnt);
	
	$('<button data-icon="home" data-iconpos="notext">Home</button>').appendTo('#treeaccions').click(function(){
		me.tree.deselect_all();
		$("#details_" + me.handler.colname).empty();
		location.hash = '#lmns|' + menu.id;
		return false;
	});
	$('<button data-icon="search" data-iconpos="notext">Search</button>').appendTo('#treeaccions').click(function(){
		$("#details_" + me.handler.colname).empty();
		
		$.prompt('Search', function(r){
			if(!r)
				return;
			
			me.$tree.find('li a').each(function(){
				if(new RegExp(r, 'i').test(this.textContent))
					$(this).addClass('ui-state-highlight');
			});
		
			var $r = me.$tree.find('li a.ui-state-highlight');

			if($r.size() === 1)
				$r.click();
		});
		
		return false;
	});
	$('<button data-icon="carat-d" data-iconpos="notext" title="Open all">Open all</button>').appendTo('#treeaccions').click(function(){
		me.tree.open_all();
		return false;
	});
	$('<button data-icon="carat-r" data-iconpos="notext" title="Close all">Close all</button>').appendTo('#treeaccions').click(function(){
		me.tree.close_all();
		return false;
	});
	
	var context = {};

	$.each(this.related, function(colname, h){
		var cn = colname;//para ser accesible dentro de visible()
		context['create_' + colname] = {
			label: $.lang('_CREATE') + ' ' + (h ? h.getTitle() : colname),
			icon: "create",
			action: function(n){me.createItem(h, n);},
			visible: function($n){
				if($n){// es un nodo
					if(!$n.find('a')[0].id)//no es un nodo de jstree
						return false;
					var nodeHandler = me.getHandler($n);
					return nodeHandler.accept.length && $.inArray(h.colname, nodeHandler.accept) !== -1;
				}
				
				// root
				if(!$.H.handlers[cn].parents)
					return true;

				var show = true;
				$.each($.H.handlers[cn].parents, function(){
					if(this.required)
						show = false;
				});
				return show;
			}
		};
	});
	
	context.remove = {
		label: $.lang('_DELETE'),
		icon: "remove",
		separator_before: true,
		visible: function($n){return $n && $n.hasClass('jstree-leaf') && !$n.hasClass('haschildren');},
		action: function($n){
			$('#vakata-contextmenu').hide();
			var $a = $n.find('a').addClass('loading');
			var t = this;
			if(confirm("¿Eliminar " + $a[0].text + "?\nNo se puede deshacer.")){
				$("#details_" + me.handler.colname).empty();
				$.ajax({
					data: {
						m: 'remove',
						id: $n.find('a')[0].id,
						s: $n.attr('rel')
					},
					type: 'POST',
					dataType: 'json',
					success: function(d){
						if(!d.error)
							t.remove($n);
						else
							$.alert(d);
					}
				});
				return true;
			} else {
				$a.removeClass('loading');
				return false;
			}
		}
	};
	
	function contextmenuFix($n){
		$.each(context, function(k){
			if(this.visible && !this.visible($n))
				$('a[rel="' + k + '"]').parent().remove();
		});
		var $cnt = $('#vakata-contextmenu ul > li');
		$cnt.first().add($cnt.last()).remove('.vakata-separator');
	}

	var valorBoton = "";
	var cont = 0;
	$.each(context, function(k,v){
		if(v.visible())	{
			valorBoton = v.label;
			cont++;
		}
	});
	if(cont===1){
		$('<button>' + valorBoton + '</button>').appendTo('#treeaccions')
			.click(function(){
				me.createItem(me.handler, this);
			});
	} else {
		$('<button data-icon="gear">' + $.lang('_CREATE') + ' ' + $.lang('object') + '</button>').appendTo('#treeaccions')
			.click(function(){
				var o = $(this).offset();
				me.tree.show_contextmenu($(this).find('ul:first'), o.left, o.top + $(this).height());
				contextmenuFix();
			});
	}
	
	$('#treeaccions')
		.controlgroup()
		.find('button').click(function(){
			$(this).blur();
		});

	this.$tree = $('#tree_'+this.handler.colname).addClass('jstree-drop').bind('loaded.jstree', function(){
	}).bind('contextmenu.jstree', function(e){
		setTimeout(function(){contextmenuFix($(e.target).parents('li:first'));}, 1);
	}).bind('open_node.jstree', function(e,d){
		d.rslt.obj.trigger('open');
	}).bind('move_node.jstree', function(e, r){
		var m = r.rslt,
			$curParent = m.op,
			$newParent = m.np,
			handler = me.getHandler(m.o);
		
		if($curParent[0] === $newParent[0]){// reorder
			var ids = [], colname = $curParent.attr('rel'), data = {};
			
			if(!colname){// root node
				colname = handler.colname;
				$curParent.find('>ul>li[rel="' + handler.colname + '"]').each(function(){
					ids.push($(this).find('a')[0].id);
				});

				data.method = 'setWeights';
			} else {// not a root node
				$curParent.find('>ul>li').each(function(){
					ids.push({$ref: 'dynobjects.' + $(this).attr('rel'), $id: $(this).find('a')[0].id});
				});

				data.method = 'setChildren';
				data.id = $curParent.find('a')[0].id;
			}

			data.args = [ids];
			data.classname = colname;
			
			$.ajax({data: data,	type: 'post'});
			
			return true;
		}
		var curPid = $curParent.hasClass('itemtree') ? null : $curParent.find('a')[0].id;
		var newPid = $newParent === -1 ? 0 : $newParent.find('a')[0].id;
		m.o.children('a').addClass('loading');
		var it = new Item(handler, null, {id: m.o.find('a')[0].id});
		var curparent = $curParent.hasClass('itemtree') ? '' : $curParent.attr('rel');
		var newparent = $newParent !== -1 ? $newParent.attr('rel') : '';
		
		it.copyOrAddToParent(curparent, newparent, curPid, newPid, r.args[3], function(done) {
			m.o.children('a').removeClass('loading');
			if(!done)
				$.jstree.rollback(r.rlbk);
			else if(r.args[3])
				r.args[0].oc.find('a')[0].id = done;
		});
		
		return true;
	}).bind('select_node.jstree', function(e,d){
		var $n = d.rslt.obj
		,	id = $n.find('a')[0].id;
		
		me.drawDetails(id, me.related[$n.attr('rel')], $n);
	}).bind("loaded.jstree", cb || $.noop)
	.jstree({
		plugins: ["themeroller", "json_data", 'languages', "ui", "crrm", "dnd", "types", "hotkeys", 'contextmenu'],
		core: {strings: {new_node: $.lang('_CREATE'), loading: $.lang('_FETCHING')}},
		themeroller: {item: 'ui-state-none'},
		json_data: {
			ajax: {
				data: function(n){
					return {
						m: 'getNodeTree',
						schema: n !== -1 ? me.getHandler(n).colname : 'dynobject',
						a: ['req', 'jstree', menu.filter.length ? menu.filter.toString() : false, 1, 'closed', menu.show_orphans],
						id: n !== -1 ? n.find('a')[0].id : me.handler.id
					};
				}
			}
		},
		types : {
			max_children: -2,
			max_depth: -2,
			valid_children: valid_children,//nodos que pueden ser root
			types: types
		},
		lang: {new_node: $.lang('_CREATE'), loading: $.lang('_FETCHING')},
		languages: this.languages,
		contextmenu: {show_at_node: false, items: function(){return context;}},
		dnd: {
			check_timeout: 100,
			open_timeout: 2000,
//			drop_finish: function(m,n){	l(m,n,this)	}
			"drop_target" : false,
            "drag_target" : false
		},
		crrm: {
			move: {
				check_move: function(m){
//					var $curParent =  m.ot._get_parent(m.o),
//						$newParent = m.np;
//					if($curParent[0] == $newParent[0])
//						return false;
					return true;
				},
				open_onmove: true
			}
		}

	}).removeClass('ui-widget-content').append('<br style="clear: both"/>');
	this.tree = $.jstree._reference('#tree_'+this.handler.colname);
	this.tree.set_lang(euca._LANGCODE);
}

itemTree.prototype.findNode = function(itemid, handler){
	var ret;
	this.$cnt.find('li').each(function(){
		var $li = $(this);
		if($li.find('a')[0].id === itemid && $li.attr('rel') === handler.colname){
			ret = $li;
			return false;
		}
		return true;
	});
	return ret;
};

itemTree.prototype.drawDetails = function(itemid, handler, node){
	var me = this;
	
	$("#details_" + this.handler.colname).drawDetails({
		itemid: itemid,
		handler: handler,
		menu: me.menu,
		hasChildren: !node.hasClass('jstree-leaf'),
		onListSelect: function(h, id){
			var $node = me.findNode(id, h);
			
			if(!$node)
				return console.log('Node not found id: ' + id + ', ' + h.colname);
			
			me.tree.select_node($node, true);
			if($node.hasClass('jstree-closed'))
				me.tree.open_node($node);
			var $parent = me.tree._get_parent($node);
			if($parent !== -1 && $parent.hasClass('jstree-closed'))
				me.tree.open_node($parent);
		},
		/*onItemChange callback
		* n: name, v: value
		*/
		onItemChange: function(n, v){
			if(n !== 'title') return;
			// Update title
			if(typeof(v) === 'string'){
				var $a = node.find('a:eq(0)');
				var tmp = $a.children("INS").clone();
				$a.html(v).prepend(tmp);
			} else {//is multilang
				$.each(v, function(code, title){
					me.tree.set_text(node, title, code);
				});
			}
			$(node).removeData('renameSaved');
		}
	});
};
itemTree.prototype.getHandlerId = function(ele){
	return this.getHandler(ele).id;
	//var r = /\d+/.exec($(ele).attr('id'));
	//return r ? parseInt(r[0]) : 0;
};
itemTree.prototype.getHandler = function(ele){
	return $.H.handlers[$(ele).attr('rel')];
};

/* Crea un nuevo item.
* h: handler del nuevo item
* n: nodo del árbol donde insertar. Si no se especifica, se insertará en la raíz del árbol
*/
itemTree.prototype.createItem = function(h, n){
	var vars, t = this.tree;
	
	if(n.length){
		vars = $.extend(true, {}, h.vars);
		vars.parentCol = {formtype: 'hidden', name: 'parentCol', value: n.attr('rel')};
		vars.parentId = {formtype: 'hidden', name: 'parentId', value: n.find('a')[0].id};
	}
	
	t.deselect_all();
	
	new Item(h, vars).showForm({
		container: $('<div class="ui-widget-content ui-corner-all"><h3 style="text-align:center">'
				+ $.lang('_CREATE') + ' ' + this.handler.getTitle() + '</h3></div>')
			.appendTo($('#details_' + this.handler.colname).empty()),
		onSubmit: function(){
			var title, data = [];
			if(this.vars.title)
				title = this.vars.title.value;
			else
				$.each(this.vars, function(t,v){
					title = v.value;
					return false;
				});
			if(typeof(title) === 'string' || !this.vars.title){
				data = title;
			} else {
				$.each(title, function(lang, value){
					data.push({title: value, language: lang});
				});
			}
			var newNode = t.create_node(
				n.length ? n : -1,
				n.length ? 'inside' : 'last',
				{data: data}//, attr: {rel: h.colname} no funciona pese a la documentación http://www.jstree.com/documentation/crrm (jj)
			);
			newNode.attr('rel', h.colname).find('a')[0].id = this.id;
			
			if(n.length){
				 t.open_node(t._get_parent(newNode));
				 t.deselect_node(t._get_parent(newNode));
			}
			
			t.select_node(newNode);
		}
	});
};

$.fn.itemTree = function(menu, cb){
	cb = cb || $.noop;
	
	if(!this.data('itemTree')){
		this.addClass('itemHandler');
		this.data('itemTree', new itemTree(this, menu, cb));
	} else
		cb.call(this);
	
	return this;
};

})(jQuery);