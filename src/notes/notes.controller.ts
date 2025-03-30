import { Controller, Get, Post, Body, Put, Param, Query, ValidationPipe, UsePipes, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateNoteResponseDto } from './dto/create-note-response.dto';
import { FindNotesQueryDto } from './dto/find-notes-query.dto';
import { FindNotesResponseDto } from './dto/note-response.dto';


@Controller('api/notes')
export class NotesController {
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
}
