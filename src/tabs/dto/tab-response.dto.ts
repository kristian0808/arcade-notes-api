import { TabItem } from "src/notes/schemas/tab.schema";

export class TabResponseDto {
    id: string;
    memberId: number;
    memberAccount: string;
    pcName?: string;
    status: string;
    items: TabItem[];
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
    closedAt?: Date;
}