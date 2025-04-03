import { 
    Controller, 
    Get, 
    Param, 
    Query, 
    Logger, 
    NotFoundException, 
    InternalServerErrorException 
} from '@nestjs/common';
import { IcafeService } from '../icafe/icafe.service';

@Controller('api/products')
export class ProductsController {
    private readonly logger = new Logger(ProductsController.name);

    constructor(private readonly icafeService: IcafeService) {}

    @Get()
    async getProducts(@Query('query') query?: string) {
        this.logger.log(`Fetching products${query ? ` with query: ${query}` : ''}`);
        try {
            const products = await this.icafeService.getProducts(query);
            return products;
        } catch (error) {
            this.logger.error(`Failed to fetch products: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to fetch products');
        }
    }

    @Get(':productId')
    async getProductById(@Param('productId') productId: string) {
        this.logger.log(`Fetching product with ID: ${productId}`);
        try {
            // For most product APIs, you might need to fetch all products and filter by ID
            // if there's no direct "get by ID" endpoint in iCafeCloud
            const products = await this.icafeService.getProducts();
            const product = products.find(p => p.product_id.toString() === productId);
            
            if (!product) {
                throw new NotFoundException(`Product with ID ${productId} not found`);
            }
            
            return product;
        } catch (error) {
            this.logger.error(`Failed to fetch product ${productId}: ${error.message}`, error.stack);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(`Failed to fetch product with ID ${productId}`);
        }
    }
}