export {};


declare global {
	interface Date {
		hmFull(): string;
		
		toUserDatetimeString(): string;
		
		toFormDateString(): string;
		
		addDays(): Date;
		
		toUserDateString(): string;
	}
}

function leadZero(n, s) {
	s = s || 2;
	
	return ('0' + n).substr(-s, s);
}

Date.prototype.addDays = function (days: number) {
	this.setDate(this.getDate() + days);
	return this;
};

Date.prototype.toUserDateString = function (intl, sep) {
	let ret;
	let date = this.getDate();
	let month = this.getMonth() + 1;
	
	sep = sep || '/';
	
	if (intl === 'en-US')
		ret = month + sep + date;
	else
		ret = date + sep + month;
	
	ret += sep + this.getFullYear();
	
	return ret;
};


Date.prototype.hmFull = Date.prototype.toUserDatetimeString = function (intl, sep) {
	return this.toUserDateString(intl, sep) + ' ' + this.toUserTimeString();
};

Date.prototype.toFormDateString = function () {
	return this.getFullYear() + '-' + leadZero(this.getMonth() + 1) + '-' + leadZero(this.getDate());
};

Date.prototype.toSpanishDatepickerString = function () {
	return leadZero(this.getDate()) + '/' + leadZero(this.getMonth() + 1) + '/' + this.getFullYear();
};

Date.prototype.toFormDateTimeString = function () {
	return this.toFormDateString() + 'T' + this.toUserTimeString();
};

Date.prototype.hm = Date.prototype.toUserTimeString = function () {
	return leadZero(this.getHours()) + ':' + leadZero(this.getMinutes());
};

Number.prototype.size = function () {
	const n = this.valueOf();
	if (!n) {
		return "-";
	}
	const e = Math.floor(Math.log(n) / Math.log(1024));
	return (Math.floor(n / Math.pow(1024, e) * 100) / 100) + ' KMGTP'.charAt(e) + 'B';
};

