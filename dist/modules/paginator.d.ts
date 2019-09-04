export default class Paginator {
    page: number;
    total: number;
    url: string;
    perPage: number;
    maxPages: number;
    numPages: number;
    first: number;
    last: number;
    constructor(page: number, total: number, url?: string, perPage?: number, maxPages?: number);
    setupUrl(url: string): void;
    render(req: any): Promise<unknown>;
    toObject(): {
        page: number;
        total: number;
        perPage: number;
        maxPages: number;
        numPages: number;
        first: number;
        last: number;
    };
}
