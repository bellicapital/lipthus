$.fn.online = function(group_id){
	return alert('TODO!');
	
	var $me = this;
	$.ajax({
		data: {method: 'fullInfo', classname: 'online'},
		success: function(d){
			$me.append('<h3>Usuarios</h3>');
			var data = {
				cols: [
					{id: 'ip', label: 'IP', type: 'string'},
					{id: 'name', label: euca._lang._NAME, type: 'string'},
					{id: 'page', label: 'Página', type: 'string'},
					{id: 'since', label: 'Desde', type: 'datetime'},
					{id: 'country', label: 'País', type: 'string'},
					{id: 'city', label: 'Ciudad', type: 'string'},
					{id: 'agent', label: 'Agente', type: 'string'}
				],
				rows: []
			};
			$.each(d.users, function(){
				if(1 || this.uid !== euca.uid){
					var date = new Date(this.since*1000);
					var uname = this.uname;
					if(this.chat && $.fn.chat)
						uname += ' <a href="javascript:$.chatWith(\'' + this.uid + '\')" class="ui-icon ui-icon-comment" style="padding:0;display: inline-block;"></a>';
					uname += ' <a href="javascript:$.alert(\'Coming soon...\')" class="ui-icon ui-icon-mail-closed" style="padding:0;display: inline-block;"></a>';
					
					data.rows.push({c:[
						{v: this.ip},
						{v: uname},
						{v: this.page},
						{v: date, f: date.toLocaleTimeString()},
						{v: this.country},
						{v: this.city},
						{v: this.agent}
					]});
				}
			});
			
			if(data.rows.length){
				$('<div>').appendTo($me).gTable({
					data: data,
					drawOptions: {allowHtml: true, showRowNumber: true, width: 960}
				});
			} else
				$me.append('<p><i>No hay usuarios conectados</i></p>');

			//Visitantes
			if(!d.anon || d.anon.length) return;
			$me.append('<h3>Visitantes</h3>');
			data = {
				cols: [
					{id: 'ip', label: 'IP', type: 'string'},
					{id: 'page', label: 'Página', type: 'string'},
					{id: 'last', label: 'hora', type: 'datetime'},
					{id: 'country', label: 'País', type: 'string'},
					{id: 'city', label: 'Ciudad', type: 'string'},
					{id: 'agent', label: 'Agente', type: 'string'}
				],
				rows: []
			};
			$.each(d.anon, function(){
				var date = new Date(this.last*1000);
				data.rows.push({c:[
					{v: this.ip},
					{v: this.page},
					{v: date, f: date.toLocaleTimeString()},
					{v: this.country},
					{v: this.city},
					{v: this.agent}
				]});
			});
			
			$('<div>').appendTo($me).gTable({
				data: data,
				drawOptions: {showRowNumber: true, width: 860}
			});
		}
	});
	return this;
};


$.getUsers = function(level){
	if(!euca.users){
		$.ajax({
			data: {method: 'getArray', classname: 'user', args: $.args([], ['level', 'uname'])},
			async: false,
			success: function(d){
				euca.users = d;
			}
		});
	}
	var ret = {};
	$.each(euca.users, function(id,user){
		if(level === undefined || level === user.level)
			ret[id] = user.uname;
	});
	return ret;
};

$.getUname = function(uid){
	var ret = null;
	$.each(euca.users, function(){
		$.each(this, function(id, uname){
			if(uid === id){
				ret = uname;
				return false;
			}
			return true;
		});
		return !ret;
	});
	if(!ret){
		$.ajax({
			data: {op: 'uname', handler: 'user', uid: uid},
			async: false,
			success: function(d){
				ret = d;
			}
		});
	}
	return ret;
};