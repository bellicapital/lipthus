jQuery.fn.extend({
	translate: function(options){
		var s = $.extend({
			success: function(){},
			error: function(e){alert(e);}
		}, options);
		
		var availableLangs;
		
		return this.each(function(){
			var originalContent = this.tagName == 'INPUT' ? $(this).val() : $(this).html();
			if(!s.to)
				return s.error(euca._lang.LangNotSet);
			if(!s.text)
				s.text = originalContent;
			if(!s.text)
				return s.error(euca._lang.NoText2Translate);
			
			var me = this, disabled = me.disabled;
			if(me.tagName == 'INPUT' || me.tagName == 'TEXTAREA'){
				$(me).val(euca._lang.Translating);
				me.disabled = true;
			} else $(me).html(euca._lang.Translating);
			$(me).addClass('ui-state-disabled');

			$.ajax({
				data: {
					classname: 'Translator',
					method: 'translate',
					args: [s.text, s.to, s.from]
				},
				type: 'post',
				success: function(r){
					$(me).removeClass('ui-state-disabled');
					var html;
					if(r.error){
						html = originalContent;
						alert(r.error);
					} else
						html = r;
				
					if(me.tagName == 'INPUT' || me.tagName == 'TEXTAREA'){
						$(me).val(html);
						me.disabled = disabled;
					} else
						$(me).html(html);
				}
			});
			
			return true;
		});
	}
});