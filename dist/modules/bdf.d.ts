import { UploadedFile } from "../interfaces/uploaded-file";
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
    getPath(): string | undefined;
    getUri(): string | null;
    uriName(ext?: string): string;
    formDataValue(): string;
    send(req: any, res: any): any;
    getKey(): string;
    toString(): string;
    static fromMongo(mongo: any, colRef?: ColRef): any;
    static fromString(str: string, colRef: any, datetime?: Date): BinDataFile | undefined;
    /**
     *
     * @param param
     * @param opt
     *
     * @return Promise<BinDataFile>
     */
    static fromFile(param: string | UploadedFile, opt?: {}): any;
    static fromUrl(url: string): Promise<BinDataFile | BinDataImage>;
    static fromBuffer(p: any, opt?: any): any;
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
import { ColRef } from "../interfaces/global.interface";
export default BinDataFile;
