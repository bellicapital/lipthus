import { Types } from "mongoose";
import { Db, GridFSBucket } from "mongodb";
import { GridFSFile } from "./gridfs-file";
import { GridFSVideo } from "./gridfs-video";
export declare class GridFS {
    db: Db;
    ns: string;
    loaded: boolean;
    err?: Error;
    constructor(db: Db, ns?: string);
    get(id: string | Types.ObjectId): GridFSFile;
    getVideo(id: string | Types.ObjectId): GridFSVideo;
    findById(id: string): Promise<GridFSFile>;
    findVideoById(id: string): Promise<GridFSVideo>;
    collection(cb: any): void;
    find(q?: any, o?: any): void;
    findOneField(id: string, field: string): Promise<unknown>;
    fromFile(file: string | any, fileOptions?: any): Promise<any>;
    getBucket(): GridFSBucket;
    /**
     *  Deletes a file with the given id
     */
    deleteOne(id: Types.ObjectId): void;
    fromUrl(url: string, fileOptions?: any): Promise<unknown>;
    static getMultimedia(filePath: string): Promise<any>;
}
