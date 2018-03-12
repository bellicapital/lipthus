import {Site} from "../site";

import {Config as Config_} from "./config";

export const Config = (site: Site) => new Config_(site).load();
