import { Document, Model } from "mongoose";
export interface LipthusModel<T extends Document, QueryHelpers = {}> extends Model<T, QueryHelpers> {
    distinctCount: (this: any, field: string, query?: any) => Promise<number>;
}
