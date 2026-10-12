import { User } from "./user.type";

export type Note = {

    id: string;
    description: string;
    sourceKey?: string | null;
    origin?: string | null;
    sourceType?: string | null;
    sourceId?: string | null;
    context?: string | null;
    date: string | null;
    hours: string | null;
    user: User | null;
    createdAt: Date;
}