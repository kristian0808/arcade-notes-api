import { Controller, Get, Param, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { IcafeService } from '../icafe/icafe.service';
import { Pc } from './dto/pc.dto';

@Controller('api/pcs')
export class PcsController {
    private readonly logger = new Logger(PcsController.name);
    constructor(private readonly icafeService: IcafeService) {}

    @Get()
    async getAllPcs(): Promise<Pc[]> {
        try {
            this.logger.log('Received request for GET /api/pcs');
            const pcs = await this.icafeService.getPcsWithUserInfo();
            return pcs;
        } catch (error) {
            this.logger.error(`Failed to get PC list: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to retrieve PC list');
        }
    }

    @Get(':pcName')
    async getPcDetails(@Param('pcName') pcName: string): Promise<Pc> {
        try {
            this.logger.log(`Received request for GET /api/pcs/${pcName}`);
            const pcDetail = await this.icafeService.getConsoleDetail(pcName);
            if (!pcDetail) {
                throw new NotFoundException(`PC '${pcName}' not found.`);
            }
            return pcDetail;
        } catch (error) {
            this.logger.error(`Failed to get PC detail for ${pcName}: ${error.message}`, error.stack);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(`Failed to retrieve details for PC '${pcName}'`);
        }
    }
}
