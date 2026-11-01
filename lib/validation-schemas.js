/**
 * Input Validation Schemas using Zod
 * Centralized validation for all API endpoints
 */

import { z } from 'zod'

// ========================================
// COMMON VALIDATORS
// ========================================

export const uuidSchema = z.string().uuid('ID tidak valid')

export const phoneSchema = z
  .string()
  .min(10, 'Nomor telepon terlalu pendek')
  .max(15, 'Nomor telepon terlalu panjang')
  .regex(/^[0-9+\-\s()]*$/, 'Format nomor telepon tidak valid')
  .transform((val) => {
    // Normalize to 628xxx format
    const digits = val.replace(/\D/g, '')
    if (digits.startsWith('0')) return `62${digits.slice(1)}`
    if (digits.startsWith('8')) return `62${digits}`
    if (digits.startsWith('620')) return `62${digits.slice(3)}`
    return digits
  })

export const emailSchema = z
  .string()
  .email('Format email tidak valid')
  .toLowerCase()
  .optional()

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')

export const currencySchema = z
  .number()
  .int('Nominal harus bilangan bulat')
  .positive('Nominal harus positif')
  .max(100000000, 'Nominal terlalu besar') // Max 100 juta

export const billingDaySchema = z
  .number()
  .int()
  .min(1, 'Tanggal jatuh tempo minimal 1')
  .max(28, 'Tanggal jatuh tempo maksimal 28')

export const coordinateSchema = z
  .number()
  .min(-180, 'Koordinat tidak valid')
  .max(180, 'Koordinat tidak valid')
  .optional()
  .nullable()

// ========================================
// CUSTOMER (PELANGGAN) SCHEMAS
// ========================================

export const createCustomerSchema = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter').max(150, 'Nama maksimal 150 karakter'),
  no_wa: phoneSchema,
  alamat: z.string().min(5, 'Alamat minimal 5 karakter').max(500, 'Alamat terlalu panjang'),
  rt: z.string().max(10).optional().nullable(),
  rw: z.string().max(10).optional().nullable(),
  paket_id: uuidSchema.optional().nullable(),
  wilayah_id: uuidSchema.optional().nullable(),
  tanggal_jatuh_tempo: billingDaySchema.default(10),
  latitude: coordinateSchema,
  longitude: coordinateSchema,
  status: z.enum(['aktif', 'isolir', 'nonaktif']).default('aktif'),
})

export const updateCustomerSchema = createCustomerSchema.partial()

// ========================================
// PACKAGE (PAKET) SCHEMAS
// ========================================

export const createPackageSchema = z.object({
  nama_paket: z.string().min(3, 'Nama paket minimal 3 karakter').max(100, 'Nama terlalu panjang'),
  kecepatan: z.string().min(1, 'Kecepatan wajib diisi').max(50, 'Kecepatan terlalu panjang'),
  harga: currencySchema,
  deskripsi: z.string().max(500, 'Deskripsi terlalu panjang').optional().nullable(),
})

export const updatePackageSchema = createPackageSchema.partial()

// ========================================
// INVOICE (TAGIHAN) SCHEMAS
// ========================================

export const createInvoiceSchema = z.object({
  pelanggan_id: uuidSchema,
  bulan: z.number().int().min(1, 'Bulan minimal 1').max(12, 'Bulan maksimal 12'),
  tahun: z.number().int().min(2024, 'Tahun tidak valid').max(2100, 'Tahun terlalu jauh'),
  jumlah_tagihan: currencySchema,
  tanggal_jatuh_tempo: dateSchema,
})

export const markPaidCashSchema = z.object({
  tagihan_id: uuidSchema,
  jumlah_bayar: currencySchema.optional(),
  catatan: z.string().max(500, 'Catatan terlalu panjang').optional().nullable(),
  diterima_oleh: z.string().max(100).optional().default('Admin'),
})

// ========================================
// PAYMENT SCHEMAS
// ========================================

export const createPaymentSchema = z.object({
  tagihan_id: uuidSchema,
})

export const paymentStatusSchema = z.object({
  tagihan_id: uuidSchema,
})

// ========================================
// WHATSAPP SCHEMAS
// ========================================

export const sendWhatsAppSchema = z.object({
  nomor: phoneSchema,
  pesan: z.string().min(1, 'Pesan tidak boleh kosong').max(4000, 'Pesan terlalu panjang'),
  mediaUrl: z.string().url('URL media tidak valid').optional().nullable(),
})

export const whatsAppBlastSchema = z.object({
  wilayah_id: uuidSchema,
  pesan: z.string().min(1, 'Pesan tidak boleh kosong').max(4000, 'Pesan terlalu panjang'),
})

// ========================================
// BULK OPERATION SCHEMAS
// ========================================

export const bulkCustomerSchema = z.object({
  action: z.enum(['update_status', 'generate_tagihan'], {
    errorMap: () => ({ message: 'Aksi tidak valid' })
  }),
  ids: z.array(uuidSchema).min(1, 'Minimal 1 pelanggan harus dipilih'),
  payload: z.object({
    status: z.enum(['aktif', 'isolir', 'nonaktif']).optional(),
    bulan: z.number().int().min(1).max(12).optional(),
    tahun: z.number().int().min(2024).max(2100).optional(),
  }).optional(),
})

export const bulkInvoiceSchema = z.object({
  action: z.enum(['pay_cash', 'cancel'], {
    errorMap: () => ({ message: 'Aksi tidak valid' })
  }),
  ids: z.array(uuidSchema).min(1, 'Minimal 1 tagihan harus dipilih'),
  reason: z.string().min(5, 'Alasan minimal 5 karakter').optional(),
})

// ========================================
// EXPENSE (PENGELUARAN) SCHEMAS
// ========================================

export const createExpenseSchema = z.object({
  kategori: z.string().min(3, 'Kategori minimal 3 karakter').max(100, 'Kategori terlalu panjang'),
  jumlah: currencySchema,
  keterangan: z.string().max(500, 'Keterangan terlalu panjang').optional().nullable(),
  tanggal_pengeluaran: dateSchema,
})

export const updateExpenseSchema = createExpenseSchema.partial()

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Validate request body against schema
 * @param {object} body - Request body to validate
 * @param {ZodSchema} schema - Zod schema
 * @returns {object} { success: boolean, data?: any, errors?: array }
 */
export function validateBody(body, schema) {
  try {
    const validated = schema.parse(body)
    return {
      success: true,
      data: validated,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      }
    }
    return {
      success: false,
      errors: [{ field: 'unknown', message: error.message }],
    }
  }
}

/**
 * Validation error response helper
 */
export function validationErrorResponse(errors) {
  return Response.json(
    {
      error: 'Validation failed',
      details: errors,
    },
    { status: 400 }
  )
}
