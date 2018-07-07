import { FileInfo } from "./file-info";
import { Collection, Types } from "mongoose";
import { BinDataImage } from "../../modules";
import { LipthusRequest, LipthusResponse } from "../../index";
export declare class GridFSFile {
    _id: string | Types.ObjectId;
    gridStore: any;
    mtime?: Date;
    uploadDate?: Date;
    filename?: string;
    length: number;
    contentType: string;
    folder?: string;
    err?: Error;
    metadata?: any;
    thumb?: any;
    versions?: {
        [s: string]: GridFSFile | Types.ObjectId;
    };
    md5?: string;
    submitter?: string;
    loaded: boolean;
    error?: Error;
    private _collection?;
    private processLog;
    private duration?;
    private fps?;
    constructor(_id: string | Types.ObjectId, gridStore: any);
    static readonly videoExt: string[];
    mTime(): Date;
    readonly databaseName: string;
    info(full: boolean): FileInfo;
    send(req: LipthusRequest, res: LipthusResponse): Promise<void>;
    toString(): string;
    /**
     *
     * @returns {Promise.any}
     */
    load(): Promise<GridFSFile>;
    setNotFound(): void;
    getVideoVersion(k: string, force: boolean): Promise<{}>;
    setVideoVersions(): void;
    checkVideoVersion(k: string, force: boolean): Promise<{}>;
    getMetadata(): Promise<this>;
    tmpFile(): any;
    createVideoVersion(k: string, force: boolean): Promise<{}>;
    update(params: any): Promise<any>;
    /**
     * elimina un archivo
     */
    unlink(): Promise<void>;
    collection(): Promise<Collection>;
    remove(): Promise<void>;
    basename(ext?: string): string;
    sendThumb(req: LipthusRequest, res: LipthusResponse): Promise<any>;
    sendFrame(req: LipthusRequest, res: LipthusResponse, position: number, opt: any): void;
    getKey(): string;
    getThumb(): Promise<any>;
    createThumb(): Promise<any>;
    getVideoFrame(position?: number): Promise<BinDataImage>;
    getVideoFrameByNumber(number: number): Promise<BinDataImage>;
    _pdfThumb(): Promise<BinDataImage>;
}
