export {Setting, SettingModel} from "../schemas/settings";
export {LipthusCache, LipthusCacheModel} from "../schemas/cache";
export {Tmp, TmpModel} from "../schemas/tmp";
export {Search, SearchModel} from "../schemas/search";
export {User, UserModel} from "../schemas/user";

declare global {

	// function l(...args: any[]): void;

	interface Date {
		// noinspection JSUnusedLocalSymbols
		toUserDatetimeString(intl: string, sep: string): string;
		toFormDateString(): string;
		// noinspection JSUnusedLocalSymbols
		addDays(days: number): any;
		// noinspection JSUnusedLocalSymbols
		toUserDateString(intl: string, sep: string): string;
		toUserTimeString(): string;
		toFormDateTimeString(): string;
		toSpanishDatepickerString(): string;
		hm(): string;
		// noinspection JSUnusedLocalSymbols
		hmFull(intl: string, sep: string): string;
	}

	interface Number {
		size(): string;
		shopFormat(): string;
		m100(): number;
	}

	interface Object {
		// noinspection JSUnusedLocalSymbols
		some(o: any, fn: (a: string, b: any) => any): void;
		// noinspection JSUnusedLocalSymbols
		each(o: any, fn: (a: string, b: any) => any): void;
		// noinspection JSUnusedLocalSymbols
		map(o: any, fn: (a: string, b: any) => any): any;
		// noinspection JSUnusedLocalSymbols
		extend(a: any, b: any): any;
		// noinspection JSUnusedLocalSymbols
		toArray(o: any): Array<any>;
		// noinspection JSUnusedLocalSymbols
		ksort(o: any): any;
		// noinspection JSUnusedLocalSymbols
		sort(o: any, fn: (a: ObjectArray, b: ObjectArray) => any): any;
		// noinspection JSUnusedLocalSymbols
		values(o: any): Array<any>;
	}

	interface String {
		ucfirst(): string;
		// noinspection JSUnusedLocalSymbols
		striptags(allowedTags?: string): string;
		// noinspection JSUnusedLocalSymbols
		truncate(length: number, options?: any): string;
	}
}

export interface ObjectArray {
	key: string;
	value: any;
}

export interface KeyValue {
	[s: string]: any;
}

