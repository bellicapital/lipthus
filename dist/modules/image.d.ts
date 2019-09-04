export default class Image {
    width: number;
    height: number;
    constructor(file: any);
    fitCalc(max_width: number, max_height: number, crop: boolean): {
        width: number;
        height: number;
    };
    static fitCalc(width: number, height: number, max_width: number, max_height: number, crop: boolean): {
        width: number;
        height: number;
    };
}
