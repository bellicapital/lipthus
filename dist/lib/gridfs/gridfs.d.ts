import { Types } from "mongoose";
import { Db } from "mongodb";
import { GridFSFile } from "./gridfs-file";
export declare class GridFS {
    db: Db;
    ns: string;
    loaded: boolean;
    err?: Error;
    constructor(db: Db, ns?: string);
    get(id: string | Types.ObjectId): GridFSFile;
    findById(id: string): Promise<GridFSFile>;
    collection(cb: any): void;
    find(): void;
    findOneField(id: string, field: string): Promise<{}>;
    fromFile(file: string | any): Promise<{}>;
}
