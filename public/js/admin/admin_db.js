$.fn.adminDb = function(){
	var $me = this,
		$bkp = $('<div style="float:left;margin:0 12px">\n\
					<h3>Backup</h3><div></div>\n\
				</div>')
			.appendTo(this).panel({collapsible: false}).find('div.ui-panel-content-text'),
		$list = $('<div style="min-width:160px; float:left;margin:0 12px"><h3>Collections</h3><div></div></div>')
			.appendTo(this).panel({collapsible: false}).find('div.ui-panel-content-text'),
		$details = $('<div style="float:left">\
				<h3>Details</h3>\
				<div>\
				 <pre style="font-size:0.6em;overflow-y: auto;max-height:700px;min-width: 300px;max-width:600px;">\
				  <code></code></pre></div></div>')
			.appendTo(this).panel({collapsible: false}).hide(),
		$detailsContent = $details.find('code');
	
	$('<button>Create</button>').appendTo($bkp).button().click(function(){
		$.ajax({
			data: {classname: 'admin', method: 'doDbBackup'}
		}).done(setBkpInfo);
	});
	
	$('<div style="width:250px"/>').appendTo($bkp).formFile({
		multi: 1,
		change: function(v, cb){
			var $qi = $(this).find('.uploadifyQueueItem');
			
			$.aj('admin', 'fromUploaded', [v.val.id]).done(function(d){
				$qi.remove();
				$.alert(d === true ? 'File ' + v.val.name + ' imported successfully' : 'Error ' + d);
			});
		}
	});
	
	$bkp.append('<hr/>');
	
	var $bkpmtime = $('<div/>').appendTo($bkp);
	
	$.ajax({
		data: {classname: 'admin', method: 'dbInfo'}
	}).done(function(d){
		d.backup && setBkpInfo(d.backup);
		listCollections(d.collections);
	});
	
	function setBkpInfo(info){
		var $t = $('<table style="width:100%">').appendTo($bkpmtime.empty());
		
		$.each(info, function(){
			$t.append('<tr>\n\
				<td>' + this.name + '</td>\n\
				<td>' + $.humanizeSize(this.size) + '</td>\n\
				<td><a href="admin/dlFile?args[]=' + this.dir + '/' + this.name + '" title="Download" data-name="' + this.name + '" class="ui-icon ui-icon-disk"></a></td>\n\
				<td><a href="#" data-dir="' + this.dir + '" data-name="' + this.name + '" title="Restore" class="ui-icon ui-icon-arrowreturnthick-1-n"></a></td></td></tr>');
		});
		$t.find('.ui-icon-arrowreturnthick-1-n').click(function(e){
			e.preventDefault();
			var fn = $(this).attr('data-name'),
				dir = $(this).attr('data-dir');
				
			$.confirm({
				message: 'Restore db backup ' + fn + '?',
				onClick: function(r){
					if(!r)
						return;
					
					$.ajax({
						data: {classname: 'admin', method: 'restoreDb', args: [$(this).attr('data-name')]}
					}).done(listCollections);
				}
			});
		});
	}
	
	function listCollections(cols){
		$list.empty();
		
		$.each(cols, function(name, count){
			$list.append('<div><span class="ui-icon ui-icon-disk" style="float:left;cursor:pointer"></span> <a href="#">' + name + '</a> (' + count + ')<div style="clear:both"></div></div>');
		});
		
		$list.find('div>*').click(function(e){
			e.preventDefault();
			
			var name = $(this).parent().find('a').text();
			var data = {classname: 'admin', method: 'exportCol', args: [name]};
			
			if($(this).hasClass('ui-icon-disk')){
				data.method = 'dumpCol',
				data.dl = true;
				location.href = '/ajax?' + $.param(data);
				return;
			}
			
			data.method = 'exportCol',
			
			$.ajax({
				data: data
			}).done(function(d){
				$details.show().find('.ui-panel-title-text').html(name);
				$detailsContent.html(JSON.stringify(d, null, '  '));
			});
		});
	}
	
	
	return this;
};