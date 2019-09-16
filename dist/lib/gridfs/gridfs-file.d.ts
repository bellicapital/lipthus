import { FileInfo } from "./file-info";
import { Types } from "mongoose";
import { BinDataImage, LipthusDb } from "../../modules";
import { LipthusRequest, LipthusResponse } from "../../index";
import { Collection, GridFSBucket } from "mongodb";
import { Response } from "express";
import { LipthusFile } from "../file-stream";
export declare class GridFSFile {
    _id: string | Types.ObjectId;
    db: LipthusDb;
    mtime?: Date;
    uploadDate?: Date;
    filename?: string;
    length: number;
    contentType: string;
    folder?: string;
    metadata?: any;
    thumb?: any;
    versions?: {
        [s: string]: any;
    };
    md5?: string;
    submitter?: string;
    loaded: boolean;
    error?: GridFSFileNotFoundError;
    duration?: number;
    private processLog;
    private fps?;
    constructor(_id: string | Types.ObjectId, db: LipthusDb);
    static readonly videoExt: string[];
    readonly id: Types.ObjectId;
    getBucket(): GridFSBucket;
    mTime(): Date;
    readonly databaseName: string;
    readonly namespace: string;
    readonly collection: Collection;
    info(full?: boolean): FileInfo;
    send(req: LipthusRequest, res: LipthusResponse): Promise<any | Response>;
    toString(): string;
    load(): Promise<GridFSFile>;
    setNotFound(): void;
    getVideoVersion(k: string, force: boolean): Promise<GridFSFile | any>;
    checkVideoVersion(k: string, force: boolean): Promise<any> | LipthusFile;
    getMetadata(): Promise<this>;
    tmpFile(): Promise<string>;
    createVideoVersion(k: string, force: boolean): Promise<any>;
    update(params: any): Promise<GridFSFile>;
    /**
     * elimina un archivo
     */
    unlink(): Promise<void>;
    private _unlink;
    remove(): Promise<void>;
    basename(ext?: string): string;
    sendThumb(req: LipthusRequest, res: LipthusResponse, opt?: any): Promise<any>;
    sendFrame(req: LipthusRequest, res: LipthusResponse, position: number, opt: any): void;
    getKey(): string;
    getThumb(): Promise<BinDataImage>;
    createThumb(): any;
    getVideoFrame(position?: number): Promise<BinDataImage>;
    getVideoFrameByNumber(number: number): Promise<BinDataImage>;
    _pdfThumb(): Promise<BinDataImage | any>;
}
declare class GridFSFileNotFoundError extends Error {
    status: number;
    constructor(msg: string);
}
export {};
