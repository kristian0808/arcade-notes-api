export class Pc {
    id?: number;
    name: string;
    status: string;
    user?: string;
    startTime?: Date;
    currentMember?: {
        id: number;
        name: string;
    };
}
