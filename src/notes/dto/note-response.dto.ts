
export class NoteDto {
    id: string;
    content: string;
    memberId: number;
    memberAccount?: string;
    pcName?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export class FindNotesResponseDto {
    notes: NoteDto[];
    total: number;
    page: number;
    limit: number;
    message?: string;
  }