/* global require, exports */

exports.install = function(){
//	require('mongoose-dbref').install();
//	require('./ref').install();@deprecated
	require('./bdf').install();
	require('./bdf-list').install();
	require('./fs').install();
	require('./mltext').install();
	require('./mlselector').install();
	require('./mlcheckboxes').install();
};
