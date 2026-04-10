import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import * as ExcelJS from 'exceljs';

import { Product } from '@/products/entities/product.schema';
import { ProductStatus } from '@/products/enums/product-status.enum';

import { ProductsImportService } from './products-import.service';

// ─── helpers ────────────────────────────────────────────────────────────────

async function buildXlsx(
  rows: Record<string, unknown>[],
  headers = ['title', 'price', 'status', 'description'],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Products');
  sheet.columns = headers.map((h) => ({ header: h, key: h }));
  for (const row of rows) sheet.addRow(row);
  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

function buildCsv(
  rows: Record<string, unknown>[],
  headers = ['title', 'price', 'status', 'description'],
): Buffer {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      headers
        .map((h) => {
          const v = row[h];
          if (v === null || v === undefined) return '';
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
            return String(v);
          return '';
        })
        .join(','),
    );
  }
  return Buffer.from(lines.join('\n'));
}

// ─── mock model ─────────────────────────────────────────────────────────────

const mockCreate = jest.fn();
const mockFindOne = jest.fn();

const productModelMock = {
  create: mockCreate,
  findOne: mockFindOne,
};

// ─── tests ──────────────────────────────────────────────────────────────────

describe('ProductsImportService', () => {
  let service: ProductsImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsImportService,
        { provide: getModelToken(Product.name), useValue: productModelMock },
      ],
    }).compile();

    service = module.get<ProductsImportService>(ProductsImportService);

    mockCreate.mockReset();
    mockFindOne.mockReset();

    // generateCode() stub — last product has code 0000099
    mockFindOne.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ productCode: '0000099' }),
    });

    mockCreate.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ ...data, _id: 'mock-id' }),
    );
  });

  // ── unsupported format ───────────────────────────────────────────────────

  it('throws 400 for unsupported file extension', async () => {
    const file = { originalname: 'data.txt', buffer: Buffer.from('hello') };
    await expect(service.importFromFile(file)).rejects.toThrow(BadRequestException);
  });

  it('throws 400 for a file with no extension', async () => {
    const file = { originalname: 'data', buffer: Buffer.from('hello') };
    await expect(service.importFromFile(file)).rejects.toThrow(BadRequestException);
  });

  // ── xlsx happy path ──────────────────────────────────────────────────────

  it('imports valid xlsx rows and returns correct count', async () => {
    const buffer = await buildXlsx([
      { title: 'Widget A', price: 9.99, status: 'active', description: 'Nice' },
      { title: 'Widget B', price: 0, status: 'draft', description: '' },
    ]);

    const result = await service.importFromFile({ originalname: 'products.xlsx', buffer });

    expect(result.imported).toBe(2);
    expect(result.failed).toHaveLength(0);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  // ── csv happy path ───────────────────────────────────────────────────────

  it('imports valid csv rows and returns correct count', async () => {
    const buffer = buildCsv([
      { title: 'Gadget X', price: 49.9, status: 'inactive', description: '' },
    ]);

    const result = await service.importFromFile({ originalname: 'products.csv', buffer });

    expect(result.imported).toBe(1);
    expect(result.failed).toHaveLength(0);
  });

  // ── validation failures ──────────────────────────────────────────────────

  it('reports missing title as a failure', async () => {
    const buffer = buildCsv([{ title: '', price: 10, status: 'active' }]);
    const result = await service.importFromFile({ originalname: 'p.csv', buffer });

    expect(result.imported).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].reason).toMatch(/title/i);
  });

  it('reports missing price as a failure', async () => {
    const buffer = buildCsv([{ title: 'A', price: '', status: 'active' }]);
    const result = await service.importFromFile({ originalname: 'p.csv', buffer });

    expect(result.imported).toBe(0);
    expect(result.failed[0].reason).toMatch(/price/i);
  });

  it('reports negative price as a failure', async () => {
    const buffer = buildCsv([{ title: 'A', price: -5, status: 'active' }]);
    const result = await service.importFromFile({ originalname: 'p.csv', buffer });

    expect(result.imported).toBe(0);
    expect(result.failed[0].reason).toMatch(/price/i);
  });

  it('reports missing status as a failure', async () => {
    const buffer = buildCsv([{ title: 'A', price: 10, status: '' }]);
    const result = await service.importFromFile({ originalname: 'p.csv', buffer });

    expect(result.imported).toBe(0);
    expect(result.failed[0].reason).toMatch(/status/i);
  });

  it('reports invalid status value as a failure', async () => {
    const buffer = buildCsv([{ title: 'A', price: 10, status: 'published' }]);
    const result = await service.importFromFile({ originalname: 'p.csv', buffer });

    expect(result.imported).toBe(0);
    expect(result.failed[0].reason).toMatch(/invalid status/i);
  });

  it('reports correct row numbers for failures (1-indexed + header)', async () => {
    const buffer = buildCsv([
      { title: 'OK', price: 10, status: 'active' },
      { title: '', price: 10, status: 'active' }, // row 3
      { title: 'OK2', price: 20, status: 'draft' },
      { title: 'Bad', price: 'nope', status: 'active' }, // row 5
    ]);

    const result = await service.importFromFile({ originalname: 'p.csv', buffer });

    expect(result.imported).toBe(2);
    expect(result.failed).toHaveLength(2);
    expect(result.failed[0].row).toBe(3);
    expect(result.failed[1].row).toBe(5);
  });

  // ── mixed valid/invalid ──────────────────────────────────────────────────

  it('imports valid rows and collects all failures from a mixed file', async () => {
    const buffer = buildCsv([
      { title: 'Good', price: 5, status: 'active' },
      { title: '', price: 5, status: 'active' }, // invalid
      { title: 'Also good', price: 15, status: 'inactive' },
    ]);

    const result = await service.importFromFile({ originalname: 'products.csv', buffer });

    expect(result.imported).toBe(2);
    expect(result.failed).toHaveLength(1);
  });

  // ── db failure ───────────────────────────────────────────────────────────

  it('reports a failure when database create throws', async () => {
    mockCreate.mockRejectedValueOnce(new Error('DB error'));

    const buffer = buildCsv([{ title: 'A', price: 10, status: 'active' }]);
    const result = await service.importFromFile({ originalname: 'p.csv', buffer });

    expect(result.imported).toBe(0);
    expect(result.failed[0].reason).toMatch(/database/i);
  });

  // ── empty file ───────────────────────────────────────────────────────────

  it('returns zero imported and zero failed for a csv with only a header row', async () => {
    const buffer = Buffer.from('title,price,status\n');
    const result = await service.importFromFile({ originalname: 'empty.csv', buffer });

    expect(result.imported).toBe(0);
    expect(result.failed).toHaveLength(0);
  });

  // ── all valid statuses ────────────────────────────────────────────────────

  it.each(Object.values(ProductStatus))('accepts status "%s"', async (status) => {
    const buffer = buildCsv([{ title: 'Item', price: 1, status }]);
    const result = await service.importFromFile({ originalname: 'p.csv', buffer });
    expect(result.imported).toBe(1);
    expect(result.failed).toHaveLength(0);
  });
});
