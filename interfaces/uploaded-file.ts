export interface UploadedFile {
	path: string;
	name?: string;
	originalname?: string;
	type?: string;
	mimetype?: string;
	buffer?: Buffer;
	mtime?: Date;
}
