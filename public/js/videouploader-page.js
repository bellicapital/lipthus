$(function() {
	
	var curCollection, curItem, curField, curList;
	
	$('.colSel a').click(function(){
		curCollection = this.hash.substr(1);
		curList = $(this).parents('.colSel').attr('data-translated') ? 'translated' : 'toTranslate';
		
		$('body').pagecontainer('change', '#collection-page', {changeHash: false});
	});
	
	$('body')
		.on('pagebeforeshow', '#collection-page',function(){
			$(this).find('>.ui-header>h1.ui-title').html(curCollection);
			
			var $sel = $('#itemSel').empty(),
				col = euca.videouploader[curCollection];
			
			$.each(col.items, function(id){
				$sel.append('<li><a href="#' + id + '">' + this + '</a></li>');
			});
			
			$sel.listview('refresh');
		})
		.on('pagebeforeshow', '#item-page',function(){
			$(this).find('>.ui-header>h1.ui-title').html(curCollection + ' · ' + curItem.title);
			
			var $sel = $('#fieldSel').empty();
		
			$.each(euca.videouploader[curCollection].fields, function(name, caption){
				$sel.append('<li><a href="#' + name + '">' + caption + '</a></li>');
			});
			
			if($sel.children().size() === 1)
				$sel.find('a').click();
			else
				$sel.listview('refresh');
		})
		.on('pagebeforeshow', '#field-page',function(){
			$(this).find('>.ui-header>h1.ui-title').html(curCollection + ' · ' + curItem.title).find('span').remove();

			$('#fieldForm').find('li:first').html('Campo: ' + euca.videouploader[curCollection].fields[curField]);
			
			$('#video-gal').empty();

			$('#video-input').removeData().val('').fileField({
				schema: curCollection,
				field:  curField,
				itemid: curItem.id,
				gallery: '#video-gal',
				type: 'video/*',
				values: curItem.fields[curField].value
			});
		})
		.on('click', '.form-thumb-delete', function(){
			var $this = $(this);
			
			$.confirm("Eliminar este video?", function(){
				$.ajax({
					url: '/form/' + curCollection + '/' + curItem.id + '/unset',
					data: {name: $this.attr('data-field')},
					type: 'post'
				}).done(function(d){
					if(d.error){
						$.error(d.error);
						$.alert(d.error);
					}
					$this.parent().remove();
				});
			});
		});
	
	$('#itemSel').on('click', 'a', function(){
		curItem = {
			title: $(this).html(),
			id: this.hash.substr(1)
		};
		
		$.ajax({
			url: location.pathname,
			data: {collection: curCollection, itemid: curItem.id}
		}).done(function(d){
			curItem.fields = d;
			
			var target = '#item-page',
				fields = Object.keys(euca.videouploader[curCollection].fields);
			
			if(fields.length === 1){
				curField = fields[0];
				target = '#field-page';
			}
			
			$('body').pagecontainer('change', target, {changeHash: false});
		});
	});
	
	$('#fieldSel').on('click', 'a', function(){
		curField = this.hash.substr(1);
		
		$('body').pagecontainer('change', '#field-page', {changeHash: false});
	});
	
	$('#fieldForm').submit(function(e){
		e.preventDefault();
		
		$.ajax({
			url: location.pathname,
			data: {collection: curCollection, itemid: curItem.id, field: curField, value: this.toTranslate.value},
			type: 'post'
		}).done(function(d){
			var fields = euca.videouploader[curCollection][curItem.id].fields,
				idx = fields.indexOf(curField),
				target = '#item-page';
			
			if(curList === 'toTranslate' && idx > -1){
				fields.splice(idx, 1);
				
				if(!fields.length){
					delete euca.videouploader[curCollection][curItem.id];
					
					if(Object.keys(euca.videouploader[curCollection]).length)
						target = '#collection-page';
					else {
						delete euca.videouploader[curCollection];
						target = '#home-page';
					}
				}
			}
			
			$('body').pagecontainer('change', target, {changeHash: false});
		});
	});
	
	$('#field-page').find('.ui-footer a:last').click(function(){
		$('#fieldForm').submit();
	});
	
	$('a[href="#collection-page"]').click(function(){
		$('body').pagecontainer('change', '#collection-page', {changeHash: false});
		return false;
	});
	
	$('a.ui-icon-carat-l[href="#item-page"]').click(function(){
		var target = Object.keys(euca.videouploader[curCollection].fields).length === 1 ? '#collection-page' : '#item-page';
		
		$('body').pagecontainer('change', target, {changeHash: false});
		return false;
	});
});