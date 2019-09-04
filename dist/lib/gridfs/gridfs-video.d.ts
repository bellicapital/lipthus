import { GridFSFile } from "./gridfs-file";
export declare class GridFSVideo extends GridFSFile {
    width: number;
    height: number;
    duration: number;
    info(): import("./file-info").FileInfo;
    load(): Promise<GridFSVideo>;
    setThumbByPosition(position?: number): Promise<any>;
}
