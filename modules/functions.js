

global.l = function () {
	console.log.apply(this, arguments);

	const orig = Error.prepareStackTrace;
	Error.prepareStackTrace = function (_, stack) {
		return stack;
	};
	const err = new Error;
	Error.captureStackTrace(err);
	const stack_ = err.stack;
	Error.prepareStackTrace = orig;

	console.log('called at %s, line %d', stack_[1].getFileName(), stack_[1].getLineNumber());
};
