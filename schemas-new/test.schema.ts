// decorators test

import {Schema} from "../lib/schema-decorator";

@Schema({
	definitions: {
	
	}
})
export class TestSchema {
	
	constructor() {
		console.log('Hi!');
	}
}
