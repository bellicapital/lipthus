import {Db as Db_} from "../modules";
import {TmpModel} from "../schemas/tmp";
import {SearchModel} from "../schemas/search";

declare class Db extends Db_ {
	
	search: SearchModel;
	tmp: TmpModel;
	
}

export = Db;
