import { UploadedFile } from "../interfaces/uploaded-file";
import { ColRef } from "../interfaces/global.interface";
import { LipthusRequest } from "../index";
export declare class BinDataFile {
    name: string;
    uploadDate: Date;
    mtime: Date;
    contentType: string;
    size: number;
    colRef: any;
    MongoBinData: any;
    key: string;
    md5: string;
    weight: number;
    constructor(data: any, colRef?: any);
    setColRef(colRef: any): void;
    info(): any;
    toJSON(): any;
    getPath(): string;
    getUri(): string;
    uriName(ext?: string): string;
    formDataValue(): string;
    send(req: LipthusRequest, res: any): Promise<any>;
    getKey(): string;
    toString(): string;
    static fromMongo(mongo: any, colRef?: ColRef): BinDataImage | BinDataFile;
    static fromString(str: string, colRef: any, datetime?: Date): BinDataImage | BinDataFile | void;
    /**
     *
     * @param param
     * @param opt
     *
     * @return Promise<BinDataFile>
     */
    static fromFile(param: string | UploadedFile, opt?: {}): Promise<BinDataFile | BinDataImage>;
    static fromUrl(url: string): Promise<BinDataFile | BinDataImage>;
    static fromBuffer(p: any, opt?: any): Promise<BinDataFile | BinDataImage>;
    /**
     * Use Bdf.fromString
     *
     * @deprecated
     * @param img
     * @param width
     * @param height
     * @param colRef
     * @param datetime
     * @returns {*}
     */
    static fromData(img: string, width: number, height: number, colRef: any, datetime?: Date): Error | BinDataImage;
    static isBdf(o: any): boolean;
}
export interface DbfInfoParams {
    path?: string;
    name: string;
    md5?: string;
    contentType: string;
    uploadDate?: Date;
    weight: number;
    mtime: Date;
    size: number;
    key: string;
}
export declare class DbfInfo implements DbfInfoParams {
    path?: string;
    name: string;
    md5?: string;
    contentType: string;
    uploadDate?: Date;
    weight: number;
    mtime: Date;
    size: number;
    key: string;
    constructor(p: DbfInfoParams);
}
import { BinDataImage } from './bdi';
export default BinDataFile;
