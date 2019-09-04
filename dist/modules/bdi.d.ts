/// <reference types="node" />
import { KeyString } from "../interfaces/global.interface";
import { BinDataFile, DbfInfo, DbfInfoParams } from './bdf';
import { LipthusRequest } from "../index";
export declare class BinDataImage extends BinDataFile {
    width: number;
    height: number;
    alt: KeyString;
    title: KeyString;
    hidden: boolean;
    text: string;
    constructor(data: any, colRef?: any);
    info(mixed?: number | LipthusRequest, height?: number, crop?: boolean, enlarge?: boolean, nwm?: boolean): any;
    toJSON(): any;
    getDimensions(): {
        width: number;
        height: number;
    };
    getThumb(width?: number, height?: number, crop?: boolean, enlarge?: boolean): any;
    getCached(db: any, opt: any): any;
    toBuffer(opt: any): Promise<Buffer>;
    send(req: any, res: any, opt?: any): any;
    postFromFile(opt?: PostParams): Promise<BinDataImage>;
    static fromFile(p: any, opt?: {}): Promise<BinDataImage>;
    /**
     *
     * @param params {{
     *      data: string (raw image data),
     *      name: string,
     *      [lastModified]: Date,
     *      [size]: number,
     *      [contentType]: string
     *      weight?: number
     * }}
     * @param colRef
     * @returns {Promise.<BinDataImage>}
     */
    static fromFrontEnd(params: any, colRef: any): Promise<BinDataImage | undefined>;
}
export interface DbfImageInfoParams extends DbfInfoParams {
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
    alt?: string;
    title?: string;
    hidden?: boolean;
    text?: string;
}
export declare class DbfImageInfo extends DbfInfo implements DbfImageInfoParams {
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
    alt?: string;
    title?: string;
    hidden?: boolean;
    text?: string;
    constructor(p: DbfImageInfoParams);
    getThumb(width: number, height?: number, crop?: boolean, nwm?: boolean, enlarge?: boolean, ext?: string): DbfThumb;
    uriName(ext: string): string;
}
export declare class DbfThumb {
    uri: string;
    name: string;
    width: number;
    height: number;
    originalUri?: string;
    originalWidth: number;
    originalHeight: number;
    alt: KeyString;
    title: KeyString;
    text: string;
    constructor(values: any);
    toHtml(): string;
}
export interface PostParams {
    noResize?: boolean;
    maxwidth?: number;
    maxheight?: number;
}
export default BinDataImage;
