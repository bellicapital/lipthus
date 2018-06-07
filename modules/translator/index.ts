import {Translator} from "./translator";
import {Site} from "../site";

export = (site: Site) => new Translator(site);
