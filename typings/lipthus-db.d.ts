import {LipthusDb as Db_} from "../modules";
import {TmpModel} from "../schemas/tmp";
import {SearchModel} from "../schemas/search";

declare class LipthusDb extends Db_ {
	
	search: SearchModel;
	tmp: TmpModel;
	
}
