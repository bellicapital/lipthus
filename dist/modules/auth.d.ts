import { Site } from "../index";
declare const _default: (site: Site) => any;
export default _default;
export interface GoogleOauth2Data {
    kind?: string;
    etag?: string;
    sub?: string;
    id?: string;
    name?: string;
    displayName?: string;
    given_name?: string;
    family_name?: string;
    profile?: string;
    picture?: string;
    image?: {
        url: string;
        isDefault: boolean;
    };
    email?: string;
    emails?: Array<{
        value: string;
        type: string;
    }>;
    email_verified?: boolean;
    gender?: string;
    locale?: string;
    language?: string;
    accessToken?: string;
}
