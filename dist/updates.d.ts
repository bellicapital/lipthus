import { Site } from "./modules";
export declare const updates: (site: Site, version: string) => Promise<{
    ok: boolean;
}>;
