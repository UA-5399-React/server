import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { parse } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';
import { Model } from 'mongoose';

import { ImportFailedRowDto, ImportProductsResponseDto } from './dto/import-products-response.dto';
import { Product, ProductDocument } from './entities/product.schema';
import { ProductStatus } from './enums/product-status.enum';

interface ImportFile {
  originalname: string;
  buffer: Buffer;
}

const VALID_STATUSES = Object.values(ProductStatus) as string[];

interface RawRow {
  title?: unknown;
  price?: unknown;
  status?: unknown;
  description?: unknown;
  imageUrl?: unknown;
}

@Injectable()
export class ProductsImportService {
  constructor(@InjectModel(Product.name) private readonly productModel: Model<ProductDocument>) {}

  async importFromFile(file: ImportFile): Promise<ImportProductsResponseDto> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (ext !== 'xlsx' && ext !== 'csv') {
      throw new BadRequestException(
        `Unsupported file format ".${ext ?? ''}". Only .xlsx and .csv are accepted.`,
      );
    }

    const rows = ext === 'xlsx' ? await this.parseXlsx(file.buffer) : this.parseCsv(file.buffer);

    const failed: ImportFailedRowDto[] = [];
    let imported = 0;

    // Validate all rows first, collect valid ones
    type ValidData = {
      title: string;
      price: number;
      status: ProductStatus;
      description?: string;
      imageUrl?: string;
    };
    const validRows: { rowNumber: number; data: ValidData }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2;
      const validation = this.validateRow(rows[i]);
      if (validation.error) {
        failed.push({ row: rowNumber, reason: validation.error });
      } else {
        validRows.push({ rowNumber, data: validation.data! });
      }
    }

    // Pre-fetch the current max code once, then increment in-memory
    let nextCode = await this.getNextCode();

    for (const { rowNumber, data } of validRows) {
      const productCode = nextCode.toString().padStart(7, '0');
      nextCode++;
      try {
        await this.productModel.create({ ...data, productCode });
        imported++;
      } catch {
        failed.push({ row: rowNumber, reason: 'Failed to save product to database' });
      }
    }

    return { imported, failed };
  }

  private async parseXlsx(buffer: Buffer): Promise<RawRow[]> {
    const workbook = new ExcelJS.Workbook();
    // ExcelJS types lag behind Node 22 Buffer generics — cast required
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.worksheets[0];

    if (!sheet) {
      return [];
    }

    const rows: RawRow[] = [];
    let headers: string[] = [];

    sheet.eachRow((row, rowNumber) => {
      const values = (row.values as (ExcelJS.CellValue | undefined)[]).slice(1); // ExcelJS is 1-indexed

      if (rowNumber === 1) {
        headers = values.map((v) => (typeof v === 'string' ? v : '').trim().toLowerCase());
        return;
      }

      if (values.every((v) => v === null || v === undefined || v === '')) {
        return; // skip empty rows
      }

      const obj: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx];
      });

      rows.push(obj as RawRow);
    });

    return rows;
  }

  private parseCsv(buffer: Buffer): RawRow[] {
    try {
      const records = parse(buffer, {
        columns: (headers: string[]) => headers.map((h) => h.trim().toLowerCase()),
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      });

      return records as RawRow[];
    } catch (err) {
      throw new BadRequestException(
        `Invalid CSV format: ${err instanceof Error ? err.message : 'parse error'}`,
      );
    }
  }

  private validateRow(row: RawRow): {
    error?: string;
    data?: {
      title: string;
      price: number;
      status: ProductStatus;
      description?: string;
      imageUrl?: string;
    };
  } {
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const rawPrice = row.price;
    const rawStatus = typeof row.status === 'string' ? row.status.trim().toLowerCase() : '';
    const description =
      typeof row.description === 'string' && row.description !== ''
        ? row.description.trim()
        : undefined;
    const imageUrl =
      typeof row.imageUrl === 'string' && row.imageUrl !== '' ? row.imageUrl.trim() : undefined;

    if (!title) {
      return { error: 'Missing required field: title' };
    }

    const price =
      typeof rawPrice === 'number'
        ? rawPrice
        : parseFloat(typeof rawPrice === 'string' ? rawPrice : '');

    if (isNaN(price)) {
      return { error: 'Missing required field: price' };
    }

    if (price < 0) {
      return { error: 'Invalid value: price must be >= 0' };
    }

    if (!rawStatus) {
      return { error: 'Missing required field: status' };
    }

    if (!VALID_STATUSES.includes(rawStatus)) {
      return { error: `Invalid status "${rawStatus}". Allowed: ${VALID_STATUSES.join(', ')}` };
    }

    return {
      data: {
        title,
        price,
        status: rawStatus as ProductStatus,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
      },
    };
  }

  private async getNextCode(): Promise<number> {
    const last = await this.productModel
      .findOne({ productCode: /^\d+$/ })
      .sort({ productCode: -1 })
      .select('productCode');

    const lastNum = parseInt(last?.productCode ?? '', 10);
    return isNaN(lastNum) ? 1 : lastNum + 1;
  }
}
