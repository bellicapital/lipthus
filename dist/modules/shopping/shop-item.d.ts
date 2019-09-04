import { LipthusSchema } from "../../lib";
import { LipthusRequest } from "../../index";
import { KeyString } from "../../interfaces/global.interface";
export declare class ShopItemExtra {
    key: string;
    value: any;
    price: number;
    static schema: LipthusSchema;
    constructor(d: any);
    getInfo(req: LipthusRequest, formatted: boolean): {
        key: string;
        value: any;
        description: any;
        price: string | number;
    };
    data4save(): {
        key: string;
        value: any;
        price: number;
    };
}
/**
 * Used in payment
 * @param {object} d
 * @returns {ShopItem}
 */
export declare class ShopItem {
    quantity: number;
    price: number;
    ref: any;
    extras: Array<any>;
    description: KeyString;
    static schema: LipthusSchema;
    constructor(d: any);
    getInfo(req: LipthusRequest, formatted: boolean): any;
    getPrice(): number;
    getTotal(): number;
    /**
     * Compara el producto con el de otro item
     * @param {ShopItem} item
     * @returns {Boolean}
     */
    equals(item: any): boolean;
    /**
     * Compara extras con otro item
     * @param {ShopItem} item
     * @returns {Boolean}
     */
    compareExtras(item: any): boolean;
    data4save(): any;
}
