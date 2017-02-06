/**
 * <b>Image animator</b><br/>
 * Animates an image based on zoom and position<br/>
 * jQuery$(selector).animage(options);<br/>
 * <u>selector</u>:<br/>
 * - img<br/>
 * - elements containing an image<br/>
 * - elements with a css background-image<br/>
 *	
 * @param options.maxZoom {float}<br/>Maximum zoom ratio for animations.<br/>Default 1.5
 * @param options.duration {string|float}<br/>jQuery.animate duration param<br/>Default: 4000
 * @param options.easing {string|float}<br/>jQuery.animate easing param<br/>Default: 'linear'
 * @param options.cyrcle {string} alternates the animation:<br/>
 * 'random' => ramdomly,<br/>'seq' => sequentially,<br/>'all' => No alternate
 * <br/>Default: 'all'
 *
 * @param methods {string}<br/>
 * <br><u>destroy:</u> $(selector).animage('destroy'); <b>TODO!!!</b>
 * <br><u>option:</u> $(selector).animage('option', name, value);
 *
 * @return jQuery
 * @type jQuery
 *
 * @example
 * $('img').animage();
 * $('img').animage({zoom: 1.8, duration: 5000});
 * $('img').ainimage('option', 'duration', 2000);//sets duration param after init
 */
jQuery.prototype.animage = function(subject) {};