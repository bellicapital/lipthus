import {Site} from "../site";

const Config_ = require('./config');

export const Config = (site: Site) => new Config_(site).load();
