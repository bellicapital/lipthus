import { LipthusSchema } from "../lib";
import { Site } from "../modules";
export interface SchemaScript {
    name: string;
    getSchema(site?: Site): LipthusSchema;
}
