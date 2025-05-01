import { Controller, Get, Post, Body, Put, Param, Query, ValidationPipe, UsePipes, ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateNoteResponseDto } from './dto/create-note-response.dto';
import { FindNotesQueryDto } from './dto/find-notes-query.dto';
import { FindNotesResponseDto } from './dto/note-response.dto';

@Controller('notes') // Removed 'api/' prefix
export class NotesController {
    private readonly logger = new Logger(NotesController.name);
    constructor(private readonly notesService: NotesService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    create(@Body() createNoteDto: CreateNoteDto): Promise<CreateNoteResponseDto> {
        return this.notesService.create(createNoteDto);
    }

    @Get()
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    findNotes(@Query() queryDto: FindNotesQueryDto): Promise<FindNotesResponseDto> {
        return this.notesService.findNotes(queryDto);
    }

    @Put(':id/resolve')
    @HttpCode(HttpStatus.OK)
    async resolveNote(@Param('id') id: string): Promise<{ success: boolean; message?: string }> {
        this.logger.log(`Received request to resolve note ID: ${id}`);
        try {
            await this.notesService.resolveNote(id);
            return { success: true, message: 'Note resolved successfully.' };
        } catch (error) {
            this.logger.error(`Failed to resolve note ${id}: ${error.message}`, error.stack);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(`Failed to resolve note ${id}`);
        }
    }
}
