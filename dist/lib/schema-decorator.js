"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// decorators test
// SchemaDecoratorFactory
function Schema(p) {
    console.log(p);
    return function (a) {
        console.log(a);
        return a;
    };
}
exports.Schema = Schema;
