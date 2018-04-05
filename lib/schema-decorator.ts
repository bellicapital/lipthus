import {KeyValue} from "../typings";

// decorators test


// SchemaDecoratorFactory

export function Schema(p: SchemaDecoratorParams) {
	
	console.log(p);
	
	return function(a: any) {
		console.log(a);
		
		return a;
	};
}

export interface SchemaDecoratorParams {
	definitions: any;
	statics?: KeyValue;
	methods?: KeyValue;
}
