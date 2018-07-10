import { Document, Connection } from "mongoose";
import { LipthusDb } from "../modules";
export interface LipthusConn extends Connection {
    eucaDb: LipthusDb;
    lipthusDb: LipthusDb;
}
export interface LipthusDocument extends Document {
    db: LipthusConn;
}
