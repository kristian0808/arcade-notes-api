import { Test, TestingModule } from '@nestjs/testing';
import { IcafeService } from './icafe.service';

describe('IcafeService', () => {
  let service: IcafeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IcafeService],
    }).compile();

    service = module.get<IcafeService>(IcafeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
