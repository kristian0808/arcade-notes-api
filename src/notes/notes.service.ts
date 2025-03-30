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

    async create(createNoteDto: CreateNoteDto): Promise<CreateNoteResponseDto> {
        const { content, pcName, memberId, memberAccount } = createNoteDto;
        let targetMemberId: number | null = null;
        let targetMemberAccount: string | null = null;
        let contextPcName: string | undefined = undefined; // Use separate variable for context
    
        this.logger.log(`Attempting to create note: ${content}`);
    
        // Scenario 1: Member ID is provided directly
        if (memberId) {
          this.logger.log(`Note context provided directly: Member ID ${memberId}. Verifying...`);
          try {
            const memberDetails = await this.icafeService.getMemberById(memberId);
    
            if (memberDetails?.member_account) { // Check member exists and has account name
              targetMemberId = memberId;
              targetMemberAccount = memberDetails.member_account; // Use verified account name
              this.logger.log(`Verified Member ID ${memberId}. Account: ${targetMemberAccount}`);
            } else {
               // Should be caught by NotFoundException below, but as extra check
              throw new NotFoundException(`Member ID ${memberId} could not be verified or found in iCafeCloud.`);
            }
          } catch(error) {
             if (error instanceof NotFoundException) {
                 throw error; // Re-throw specific 404 error
             }
              this.logger.error(`Failed to verify member ID ${memberId}: ${error.message}`);
              throw new InternalServerErrorException(`Failed to verify member before creating note.`);
          }
        
        // Scenario 2: Member Account is provided directly
        } else if (memberAccount) {
          this.logger.log(`Note context provided via Member Account: ${memberAccount}. Verifying...`);
          try {
            const memberDetails = await this.icafeService.getMemberByAccount(memberAccount);
            
            if (memberDetails?.member_id && memberDetails?.member_account) {
              targetMemberId = memberDetails.member_id;
              targetMemberAccount = memberDetails.member_account;
              this.logger.log(`Verified Member Account ${memberAccount}. ID: ${targetMemberId}`);
            } else {
              throw new NotFoundException(`Member with account '${memberAccount}' could not be verified or found in iCafeCloud.`);
            }
          } catch(error) {
            if (error instanceof NotFoundException) {
              throw error; // Re-throw specific 404 error
            }
            this.logger.error(`Failed to verify member account ${memberAccount}: ${error.message}`);
            throw new InternalServerErrorException(`Failed to verify member account before creating note.`);
          }
    
        // Scenario 3: Only pcName is provided
        } else if (pcName) {
          this.logger.log(`Note context provided via PC: ${pcName}. Fetching details...`);
          contextPcName = pcName; // Record that PC context was used
          try {
            const consoleDetail = await this.icafeService.getConsoleDetail(pcName);
    
            if (consoleDetail?.member_id && consoleDetail.member_id !== 0 && consoleDetail.member_account) {
              targetMemberId = consoleDetail.member_id;
              targetMemberAccount = consoleDetail.member_account;
              this.logger.log(`Found Member ${targetMemberAccount} (ID: ${targetMemberId}) on ${pcName}`);
            } else {
              this.logger.warn(`No active member session found on ${pcName} via consoleDetail.`);
              throw new BadRequestException(`Cannot add note: No active member session found on ${pcName}.`);
            }
          } catch (error) {
             if (error instanceof NotFoundException) {
               throw new NotFoundException(`PC '${pcName}' not found via iCafeCloud API.`);
             }
            this.logger.error(`Failed to get console detail for ${pcName}: ${error.message}`);
            throw new InternalServerErrorException(`Failed to verify PC status before creating note.`);
          }
        } else {
          // Scenario 4: Neither context provided
          throw new BadRequestException('Note creation requires context: provide memberId, memberAccount, or pcName.');
        }
    
        // Final Check & Save Note
        if (targetMemberId === null || targetMemberAccount === null) {
             throw new InternalServerErrorException('Critical error: Failed to determine target member for the note.');
        }
    
        const newNote = new this.noteModel({
          content,
          pcName: contextPcName, // Store the pcName if used for context
          memberId: targetMemberId,
          memberAccount: targetMemberAccount,
          isActive: true,
        });
    
        try {
          const savedNote = await newNote.save();
          this.logger.log(`Note created successfully with ID: ${savedNote._id}`);

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

    /**
     * Find notes for a member based on query parameters
     * @param queryDto Query parameters for filtering notes
     * @returns Promise with paginated notes and metadata
     */
    async findNotes(queryDto: FindNotesQueryDto): Promise<FindNotesResponseDto> {
        const { memberId, memberAccount, pcName, status, page = 1, limit = 10 } = queryDto;
        
        this.logger.log(`Finding notes with query: ${JSON.stringify(queryDto)}`);
        
        // Build filter query
        const filter: any = {};
        
        // If memberAccount is provided, get the corresponding memberId
        if (memberAccount && !memberId) {
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
        } else if (memberId) {
            filter.memberId = memberId;
            this.logger.log(`Filtering by memberId: ${memberId}`);
        }
        
        // Add PC name filter if provided
        if (pcName) {
            filter.pcName = pcName;
            this.logger.log(`Filtering by pcName: ${pcName}`);
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
            
            // Get paginated notes
            const notes = await this.noteModel.find(filter)
                .sort({ createdAt: -1 }) // Sort by creation date, newest first
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
}
