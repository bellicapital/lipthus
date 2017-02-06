(function($){
	"use strict";

var $accordion, $adminmenu;

//$('#content').loading();
$.loadingMsg();

if(location.hash)
	location.hash = location.hash.replace(/%7C/g, '|');

$(window).bind('hashchange', function(){
	var accordion = $accordion.data('uiAccordion');
	
	if(!accordion){
		subHashCheck();
		return;
	}
	
	var accordionHref = location.hash.replace(/\|.*$/, '');
	
	if(!accordion.active.size() || accordion.active.find('a').attr('href') !== accordionHref){
		var $header = $('a[href="' + accordionHref + '"]').parent().data('virtual', true),
			idx = $header.index('h3');
			
		$accordion.accordion('option','active', idx);
	} else
		subHashCheck();
});

function subHashCheck(){
	var h = location.hash.split('|');
	
	if(h.length < 2)
		return;
	
	var $link1 = $accordion.find('a[href="' + h[0] + '|' + h[1] + '"]');
	
	if(!$link1.parent().hasClass('ui-state-active'))
		$link1.click();
	
	if(h.length > 2){
		var $link2 = $('a[href="' + h[2] + '"]');
	
		if(!$link2.hasClass('ui-state-active') || !$link2.parent().hasClass('ui-state-active'))
			$link2.click();
	}
}

$.fn.eucAdmin = function(){
	$.loadingMsg();
	
	this.append('<table id="admin-cont"><tr>\n\
		<td id="adminmenu"><div id="accordion-menu"></div></td>\n\
		<td id="admincontent" class="ui-widget"></td>\n\
		</tr></table>');
	
	$accordion = $('#accordion-menu');
	$adminmenu = $('#adminmenu');
	
	_addTabs({lmns: ["LMN's"]});
	
	$.ajax({
		data: {cl: 'admin', m: 'start'},
		success: function(d){
			$.H = new Handlers(d.handlers);
			$.tz = d.timeZ;
			euca.configGroups = d.configGroupList;
			euca.misc = d.misc;
			euca.themes = d.themes;
			
			if(d.custom){
				euca.custom = d.custom;
				_addTabs({custom: ["Admin"]});
			}
			
			if(euca.user.level > 3)
				_addTabs({
					config: ["Config", 'config'],
					users: [$.lang('Users'), 'user'],
					pages: [$.lang('Pages'), 'page'],
					misc: ["Misc", 'misc'],
					logs: ['Logs']
				});

			if(euca.user.level > 4){
				_addTabs({
					utilities: [$.lang('Utilities')]
				});
			}
	
			var $h3 = $accordion.find('h3');

			if($h3.size() === 1){// sólo hay un bloque. No pintamos acordeón.
				var $div = $h3.next();

				$h3.remove();

				var func = $div[0].id.substr(4) + 'Tab_';

				$div[func]();

				if($accordion.find('li a').size() === 1){// sólo hay una opción.
					$accordion.find('li a').click();// Hacemos click
					$accordion.empty().width(0);//  y quitamos el menú
				} else {	//Panel
					$div.addClass('ui-widget ui-state-default ui-corner-all');
				}
			} else {
				$accordion.accordion({
					heightStyle: 'content',
					active: null,
					beforeActivate: function(e, ui){
						$('#admincontent').empty();
						ui.oldPanel.find('li').removeClass('ui-state-active');

						if(!ui.newHeader.size()){
							location.hash = null;
							return;
						}

						if(ui.newHeader.data('virtual'))
							ui.newHeader.data('virtual', null);
						else {
							var nh = ui.newHeader.find('a')[0].href;

							if(!new RegExp(nh).test(location.href))
								location.href = nh;
						}

						var func = ui.newPanel[0].id.substr(4) + 'Tab_';

						ui.newPanel[func]();
					}
				});

				if(!location.hash)
					location.hash = '#lmns';
				else
					$(window).trigger('hashchange');
			}

			menuItems();

			$.endLoadingMsg();
			$('#content').endLoading();

			var hash = location.hash.match(/#([^|]+)/);

			if(hash){
				hash = hash[1];

				$('#adm_' + hash)[hash + 'Tab_']();
			}
		}
	});
	
	$accordion.on('mouseover mouseout', 'li', function(){
		$(this).toggleClass('ui-state-hover');
	});
	
	$accordion.on('click', 'li a', function(){
		$(this).parent().siblings().removeClass('ui-state-active');
		$(this).parent().addClass('ui-state-active');
	});
	
	$accordion.on('menuLoaded', '> div', subHashCheck);

	function _addTabs(tabs){
		$.each(tabs, function(k, t){
			$accordion.append('<h3><a href="#' + k + '">' + t[0] + '</a></h3>\
				<div id="adm_' + k + '" data-js="' + (t[1] || '') + '"></div>');
		});
	}
};

function menuItems(){
	var reflink = '?reflink=' + encodeURIComponent('/admin#utilities');
	var $ul = $('<ul>').appendTo($adminmenu);

	var obj = {
		files: 'Files',
		comments: $.lang('_COMMENTS'),
		"mail-templates": "Mail Templates",
		blogger: "Blogger",
		w3cv: "W3 Validator",
		translate: "Translate"
	};

	$.each(obj, function(k, name) {
		$ul.append('<li class="ui-state-default"><a href="/' + k + reflink + '">' + name + '</a></li>');
	});
}

function clickOnHashChange(){
	var h = location.hash.split('|');
	if(h.length >2)
		$('#' + h[2]).click();
}

$.fn.lmnsTab_= function(){
	var $ul = this.find('>ul');

	if(!$ul.size()){
		$ul = $('<ul></ul>').appendTo(this);
		
		$ul.on('click', 'a', function(){
			var id = $(this).attr('href').substr(6);

			$('#admincontent > *').remove();
			$('<div class="itemAdmin ui-widget"></div>')
				.appendTo('#admincontent').itemTree($.H.menus[id], clickOnHashChange)
				.bind('select_node.itemtree', function(e, itemid, $n){
					// is it's a root node, change the hash'
					if($n.parent().parent().hasClass('jstree'))
						location.hash = '#lmns|' + id + '|' + itemid;
				});
		});
		

		
		$(window).bind('hashchange', clickOnHashChange);
	
		$ul.empty();
		
		$.each($.H.menus, function(id){
			$ul.append('<li class="ui-state-default"><a href="#lmns|' + id + '">' + $.safeLang(this.title) + '</a></li>');
		});
	}

	return this.trigger('menuLoaded');
};

$.fn.usersTab_= function(){
	var $ul = this.find('ul');

	if(!$ul.size()){
		$ul= this.append('<ul></ul>').find('ul');

		$ul.append('<li class="ui-state-default"><a href="#users|adminUser">' + $.lang('Users') + '</a></li>');
		$ul.append('<li class="ui-state-default"><a href="#users|online">Online</a></li>');
		$ul.append('<li class="ui-state-default"><a href="#users|subscriptions">Subscriptions</a></li>');
		$ul.find('a').click(function(){
			$(this).parent().addClass('ui-state-default ui-selectee ui-selected');
			$('#admincontent > *').remove();
			$('<div></div>').appendTo('#admincontent')[$(this).attr('href').substr(7)]();
		});
	}

	return this.trigger('menuLoaded');
};

$.fn.configTab_ = function(){
	var $ul = this.find('ul');
	
	if(!$ul.size()){
		$ul = this.append('<ul></ul>').find('ul');
		
		$.each(euca.configGroups, function (group_name, title){
			$ul.append('<li class="ui-state-default"><a href="#config|' + group_name + '">' + title + '</a></li>');
		});

		if(euca.user.level > 4){
			$ul.append(
				'<li class="ui-state-default"><a href="#config|dynobjects">' + $.lang('Objects') + '</a></li>' +
				'<li class="ui-state-default"><a href="#config|menu">' + $.lang('Menus') + '</a></li>'
			);
		}

		$ul.find('a').click(function(){
			$(this).parent().addClass('ui-state-default ui-selectee ui-selected');
			$('#admincontent > *').remove();
			
			var group_name = $(this).attr('href').replace(/^[^\|]+\|/, ''),
				$div = $('<div class="ui-widget-content ui-corner-all"></div>').appendTo('#admincontent');

			switch(group_name){
				case 'dynobjects':
					$div.dynObjectsAdmin();
					break;
				case 'menu':
					$div.adminMenus();
					break;
				case 'content':
					$div.adminContent();
					break;
				case 'urls':
					$div.urls();
					break;
				default:
					$div.adminConfig(group_name);
			}
		});
	}
	
	return this.trigger('menuLoaded');
};

$.fn.pagesTab_ = function(){
	var $me = this.loading();
	
	$.ajax({
		data: {
			schema: 'page',
			m: 'getAll'
		},
		success: function(d){
			$me.endLoading();

			var $ul = $me.empty().append('<ul></ul>').find('ul');

			$.each(d, function(){
				$('<li class="ui-state-default"><span class="ui-icon ui-icon-arrowthick-2-n-s" style="float:left"></span><a href="#pages|' + this.key + '">'
					+ /*(this.title && this.title[euca._LANGCODE] || this.key)*/ this.key + '</a></li>')
					.appendTo($ul).data('page', this);
			});
			$ul.find('li').click(function(){
				$('#admincontent').empty().append('<div>').find('div').adminPage($(this).data('page'), this);
			});
			$ul.sortable({
				cancel: ".ui-state-highlight",
				update: function(){
					var sorted = [], page;
					$ul.find('li:has(span)').each(function(){
						page = $(this).data('page');
						sorted.push(page.key);
					});
					$.ajax({
						data: {
							classname: 'page',
							method: 'sort',
							args: [sorted]
						},
						type: 'post',
						success: function(d){
						}
					});
				}
			}).disableSelection();

			$('<li class="ui-state-default ui-state-highlight"><a href="#pages">' + $.lang('Crear') + '</a></li>')
				.appendTo($ul)
				.css('margin-top', '12px')
				.click(function(){
					$('#admincontent').empty().append('<div>').find('div').createPage();
				}
			);

			$me.trigger('menuLoaded');
		}
	});
};

$.fn.miscTab_ = function(){
	var $ul = this.find('ul');
	
	if(!$ul.size()){
		$ul = this.append('<ul></ul>').find('ul');
		
		$.each(['Multilang', 'RSS', 'Sitemap', 'Robots', 'Cache', 'CheckObjects', 'Payments', 'Translations'], function (){
			$ul.append('<li class="ui-state-default"><a href="#misc|' + this + '">' + this + '</a></li>');
		});

		var d = euca.misc;

		$ul.find('a').click(function(){
			$('#admincontent > *').remove();
			var hash = this.hash.substr(6);
			var $div = $('<div class="misc-cont">').appendTo('#admincontent');
			
			if($.inArray(hash, ['CheckObjects']) === -1)
				$div.addClass('ui-widget-content ui-corner-all').css({padding: 10});

			$div['misc' + hash](d);
		});

		$ul.find('[href="#misc|Cache"]').append('<span> (' + d.cache + ')');
	}
	return this.trigger('menuLoaded');
};

$.fn.utilitiesTab_ = function(){
	var $ul = this.find('ul');
	
	if(!$ul.size()){
		$ul = this.append('<ul></ul>').find('ul');
		
		$.each({
			search: 'Search',
			favicontool: 'Favicon',
			db: 'Db',
			maintenance: 'Maintenance',
			helocheck: 'Helocheck',
			wss: 'Sockets'
		}, function(k,v){
			$ul.append('<li class="ui-state-default"><a href="#utilities|' + k + '">' + $.lang(v) + '</a></li>');
		});

		$('ul a', this).click(function(){
			$('.utilAdmin').remove();
			$('#admincontent > *').remove();

			var $a = $(this),
				n = $(this).attr('href').substr(11),
				$c = $('<div class="utilAdmin"></div>').appendTo('#admincontent'),
				func = 'admin' + n.charAt(0).toUpperCase() + n.slice(1);

			$c.bind('panelChanged', function(){
				$a.click();
			});

			$c[func]();
		});
	}
	
	return this.trigger('menuLoaded');
};

$.fn.customTab_ = function(){
	if(!this.children().size()){
		var $ul = $('<ul>').appendTo(this);
		
		$.each(euca.custom, function(){
			$('<li class="ui-state-default"><a href="' + this.url + '">' + this.caption + '</a></li>').appendTo($ul);
		});
		
		$ul.on('click', 'a', function(){
			$('#admincontent').html(
				'<iframe src="' + this.href + '" height="' + (window.innerHeight - $('#header').outerHeight() - 10)
				+ '" frameborder="0" width="100%" scrolling="auto" marginheight="0"/>');
			
			return false;
		});
	}
	
	return this.trigger('menuLoaded');
};

$.fn.logsTab_ = function(){
	if(!this.children().size()){
		this.append('<ul>\n\
			<li class="ui-state-default"><a href="/search-log">Searches</a></li>\
			<li class="ui-state-default"><a href="/form-log">Forms</a></li>\
			<li class="ui-state-default"><a href="/email-log">Emails sent</a></li>\
			<li class="ui-state-default"><a href="/cache">Cache</a></li>\
			<li class="ui-state-default"><a href="#" data-fn="logBots">Bots</a></li>\
			<li class="ui-state-default"><a href="#" data-fn="logErrors">Errors</a></li>\
			<li class="ui-state-default"><a href="#" data-fn="logNotFound">404</a></li>\
		</ul>')
			.find('a')
			.click(function(e){
				e.preventDefault();

				var $ac = $('#admincontent').empty();

				if(this.dataset.fn)
					$('<div class="misc-cont">').appendTo($ac)[this.dataset.fn]();
				else
					$ac.append(
						'<iframe src="' + this.href + '" height="' + (window.innerHeight - $('#header').outerHeight() - 10)
						+ '" frameborder="0" width="100%" scrolling="auto" marginheight="0"/>');
			});
	}
	
	return this.trigger('menuLoaded');
};

$.fn.adminFavicontool = function(){
	this.addClass('ui-widget-content ui-corner-all').css({padding: '12px'})
		.append('<iframe width="470px" height="200px" frameborder="0" src="ajax?method=favicon"></iframe>');
};

$.contentReady(function(){
	$.endLoadingMsg();
	$('#content').endLoading().empty().eucAdmin();
});

})(jQuery);