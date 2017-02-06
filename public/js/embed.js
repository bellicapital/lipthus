/**
 * Created by jj on 22/11/16.
 */

var fitCalc = function(width, height, max_width, max_height){
	var s = Math.min(max_width / width, max_height / height);
	return {width: s * width, height: s * height};
};

$(function() {
	var $video = $('video');
	var video = euca.video;
	var width = video.width;
	var height = video.height;

	$(window).resize(function () {
		var fit = fitCalc(width, height, window.innerWidth, window.innerHeight);
		$video.width(fit.width).height(fit.height);
	}).resize();

	$video.show();
});