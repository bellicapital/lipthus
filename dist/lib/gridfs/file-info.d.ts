export declare class FileInfo implements FileInfoParams {
    id: string;
    uri: string;
    db: string;
    name: string;
    basename?: string;
    /**
     * thumbnail timestamp
     */
    thumbTS?: number;
    size?: number;
    key?: string;
    lastModifiedDate?: Date;
    contentType?: string;
    thumb?: string;
    versions?: any;
    folder?: string;
    md5?: string;
    submitter?: string;
    error?: Error;
    width?: number;
    height?: number;
    duration?: number;
    constructor(values: FileInfoParams);
    getThumb(width: number, height: number, crop: boolean, enlarge?: boolean): FileThumb;
}
export declare class FileThumb implements FileThumbParams {
    name: string;
    width: number;
    height: number;
    uri: string;
    originalUri: string;
    ts?: number;
    constructor(p: FileThumbParams);
    toHtml(): string;
}
export interface FileInfoParams {
    id: string;
    uri: string;
    db: string;
    name?: string;
    basename?: string;
    /**
     * thumbnail timestamp
     */
    thumbTS?: number;
    size?: number;
    key?: string;
    lastModifiedDate?: Date;
    contentType?: string;
    thumb?: string;
    versions?: any;
    folder?: string;
    md5?: string;
    submitter?: string;
    error?: Error;
}
export interface FileThumbParams {
    name: string;
    width: number;
    height: number;
    uri: string;
    originalUri: string;
    /**
     * thumbnail timestamp
     */
    ts?: number;
}
