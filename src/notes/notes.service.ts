import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { IcafeService } from '../icafe/icafe.service';
import { CreateNoteResponseDto } from './dto/create-note-response.dto';

import { NoteDto, FindNotesResponseDto } from './dto/note-response.dto';
import { FindNotesQueryDto, NoteStatus } from './dto/find-notes-query.dto';

@Injectable()
export class NotesService {
    private readonly logger = new Logger(NotesService.name);

    constructor(
        // Inject the Note model and the IcafeService
        @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
        private readonly icafeService: IcafeService,
    ) { }

 // Simplified create method in notes.service.ts
async create(createNoteDto: CreateNoteDto): Promise<CreateNoteResponseDto> {
  const { content, pcName, memberId, memberAccount } = createNoteDto;
  let targetMemberId: number | null = null;
  let targetMemberAccount: string | null = null;
  let contextPcName: string | undefined = undefined; // Optional context

  this.logger.log(`Attempting to create note for member: ${content}`);

  // APPROACH 1: Member ID is provided directly
  if (memberId) {
    this.logger.log(`Note for Member ID ${memberId}. Verifying...`);
    try {
      const memberDetails = await this.icafeService.getMemberById(memberId);

      if (memberDetails?.member_account) {
        targetMemberId = memberId;
        targetMemberAccount = memberDetails.member_account;
        this.logger.log(`Verified Member ID ${memberId}. Account: ${targetMemberAccount}`);
      } else {
        throw new NotFoundException(`Member ID ${memberId} could not be verified.`);
      }
    } catch(error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to verify member before creating note.`);
    }
  }
  // APPROACH 2: Member Account is provided
  else if (memberAccount) {
    this.logger.log(`Note for Member Account: ${memberAccount}. Verifying...`);
    try {
      const memberDetails = await this.icafeService.getMemberByAccount(memberAccount);
      
      if (memberDetails?.member_id && memberDetails?.member_account) {
        targetMemberId = memberDetails.member_id;
        targetMemberAccount = memberDetails.member_account;
        this.logger.log(`Verified Member Account ${memberAccount}. ID: ${targetMemberId}`);
      } else {
        throw new NotFoundException(`Member with account '${memberAccount}' could not be verified.`);
      }
    } catch(error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to verify member account before creating note.`);
    }
  }
  // APPROACH 3: Only PC name is provided (look up current member on that PC)
  else if (pcName) {
    this.logger.log(`Note created via PC: ${pcName}. Finding current member...`);
    // contextPcName = pcName; // Record PC for context
    throw new BadRequestException('Note creation requires a member context: provide memberId or memberAccount.');

    // try {
    //   const consoleDetail = await this.icafeService.getConsoleDetail(pcName);

    //   if (consoleDetail?.member_id && consoleDetail.member_id !== 0 && consoleDetail.member_account) {
    //     targetMemberId = consoleDetail.member_id;
    //     targetMemberAccount = consoleDetail.member_account;
    //     this.logger.log(`Found Member ${targetMemberAccount} (ID: ${targetMemberId}) on ${pcName}`);
    //   } else {
    //     this.logger.warn(`No active member session found on ${pcName} via consoleDetail.`);
    //     throw new BadRequestException(`Cannot add note: No active member session found on ${pcName}.`);
    //   }
    // } catch (error) {
    //   if (error instanceof NotFoundException) {
    //     throw new NotFoundException(`PC '${pcName}' not found via iCafeCloud API.`);
    //   }
    //   throw new InternalServerErrorException(`Failed to verify PC status before creating note.`);
    // }
  } else {
    // No context provided
    throw new BadRequestException('Note creation requires a member context: provide memberId, memberAccount, or pcName.');
  }

  // Final Check & Save Note
  if (targetMemberId === null || targetMemberAccount === null) {
    throw new InternalServerErrorException('Critical error: Failed to determine target member for the note.');
  }

  // If pcName wasn't explicitly provided but was derived from another method,
  // use the provided pcName parameter first, otherwise use the context one
  // const notePcName = pcName || contextPcName;

  const newNote = new this.noteModel({
    content,
    pcName, // PC name is optional context
    memberId: targetMemberId,
    memberAccount: targetMemberAccount,
    isActive: true,
  });

  try {
    const savedNote = await newNote.save();
    this.logger.log(`Note created successfully for member ${targetMemberAccount} with ID: ${savedNote._id}`);

    // Return custom response DTO
    const response: CreateNoteResponseDto = {
      id: savedNote._id.toString(),
      message: "Note created successfully."
    };
    
    return response;
  } catch (error) {
    this.logger.error(`Failed to save note to database: ${error.message}`, error.stack);
    throw new InternalServerErrorException('Failed to save the note.');
  }
}

// Update findNotes method to prioritize member filtering
async findNotes(queryDto: FindNotesQueryDto): Promise<FindNotesResponseDto> {
  const { memberId, memberAccount, pcName, status, page = 1, limit = 10 } = queryDto;
  
  this.logger.log(`Finding notes with query: ${JSON.stringify(queryDto)}`);
  
  // Build filter query
  const filter: any = {};
  
  // Priority 1: Filter by member ID if available
  if (memberId) {
    filter.memberId = memberId;
    this.logger.log(`Filtering by memberId: ${memberId}`);
  }
  // Priority 2: If memberAccount is provided, get the corresponding memberId
  else if (memberAccount) {
    try {
      const memberDetails = await this.icafeService.getMemberByAccount(memberAccount);
      if (memberDetails?.member_id) {
        filter.memberId = memberDetails.member_id;
        this.logger.log(`Found memberId ${memberDetails.member_id} for account ${memberAccount}`);
      } else {
        throw new NotFoundException(`Member account '${memberAccount}' not found in iCafeCloud.`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to verify member account ${memberAccount}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to verify member account before finding notes.`);
    }
  }
  
  // Optional secondary filter by PC name 
  if (pcName) {
    filter.pcName = pcName;
    this.logger.log(`Additional filtering by pcName: ${pcName}`);
  }
  
  // Add status filter if provided
  if (status && status !== NoteStatus.ALL) {
    filter.isActive = status === NoteStatus.ACTIVE;
    this.logger.log(`Filtering by status: ${status}`);
  }
  
  // Calculate skip for pagination
  const skip = (page - 1) * limit;
  
  try {
    // Get total count of matching notes
    const total = await this.noteModel.countDocuments(filter);
    
    if (total === 0) {
      this.logger.log('No notes found for the given criteria');
      return {
        notes: [],
        total: 0,
        page,
        limit,
        message: 'No notes found for the given criteria'
      };
    }
    
    // Get paginated notes, sorting by creation date (newest first)
    const notes = await this.noteModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    
    this.logger.log(`Found ${notes.length} notes out of ${total} total`);
    
    // Map to response DTO
    const noteResponses: NoteDto[] = notes.map(note => {
      const noteDoc = note as unknown as NoteDocument;
      return {
        id: noteDoc._id.toString(),
        content: noteDoc.content,
        memberId: noteDoc.memberId,
        memberAccount: noteDoc.memberAccount,
        pcName: noteDoc.pcName,
        isActive: noteDoc.isActive,
        createdAt: noteDoc.createdAt,
        updatedAt: noteDoc.updatedAt
      };
    });
    
    return {
      notes: noteResponses,
      total,
      page,
      limit
    };
  } catch (error) {
    this.logger.error(`Failed to retrieve notes: ${error.message}`, error.stack);
    throw new InternalServerErrorException('Failed to retrieve notes');
  }
}

    /**
     * Resolve a note by setting its isActive flag to false
     * @param id The ID of the note to resolve
     * @returns The updated note document
     */
    async resolveNote(id: string): Promise<NoteDocument> {
        this.logger.log(`Attempting to resolve note with ID: ${id}`);

        // Find the note by ID and update its isActive flag to false
        const updatedNote = await this.noteModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true } // Option to return the modified document
        ).exec();

        if (!updatedNote) {
            this.logger.warn(`Note with ID ${id} not found for resolving.`);
            throw new NotFoundException(`Note with ID ${id} not found.`);
        }

        this.logger.log(`Note ${id} marked as resolved successfully.`);
        return updatedNote;
    }


    // In notesService.ts
async getActivePcNotesMap(pcNames: string[]): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  
  try {
      // Find all active notes for the given PCs
      const notes = await this.noteModel.find({
          pcName: { $in: pcNames },
          isActive: true
      }).exec();
      
      // Create a map of PC names to boolean (has active notes)
      pcNames.forEach(pcName => {
          result[pcName] = notes.some(note => note.pcName === pcName);
      });
      
      return result;
  } catch (error) {
      this.logger.error(`Failed to get PC notes map: ${error.message}`);
      return {};
  }
}
}

