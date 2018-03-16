export interface UploadedFile {
	path: string;
	name?: string;
	originalname?: string;
	contentType?: string;
	type?: string;
	mimetype?: string;
	buffer?: Buffer;
	mtime?: Date;
	width?: number;
	height?: number;
}
