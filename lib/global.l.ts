

function l (this: any, ...args: any): void {
	console.log.apply(this, args);

	const orig = Error.prepareStackTrace;
	Error.prepareStackTrace = function (_, stack) {
		return stack;
	};
	const err = new Error;
	Error.captureStackTrace(err);
	const stack_ = err.stack as any;
	Error.prepareStackTrace = orig;

	console.log('called at %s, line %d', stack_[1].getFileName(), stack_[1].getLineNumber());
}

(global as any).l = l;
