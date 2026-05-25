const fs = require('fs/promises');
const path = require('path');
const { invoiceStorageDir } = require('../config/env');

const normalizeStorageKey = (storageKey) => {
  if (!storageKey || typeof storageKey !== 'string') {
    const error = new Error('Invalid invoice storage key');
    error.status = 400;
    throw error;
  }

  const normalized = storageKey.replace(/\\/g, '/');
  if (normalized.startsWith('/') || normalized.includes('..')) {
    const error = new Error('Unsafe invoice storage key');
    error.status = 400;
    throw error;
  }

  return normalized;
};

const resolveStoragePath = (storageKey) => {
  const normalized = normalizeStorageKey(storageKey);
  return path.resolve(invoiceStorageDir, ...normalized.split('/'));
};

const buildInvoiceStorageTarget = ({ reference, generatedAt = new Date(), fileName = `${reference}.pdf` }) => {
  const year = String(generatedAt.getUTCFullYear());
  const month = String(generatedAt.getUTCMonth() + 1).padStart(2, '0');
  const safeFileName = path.basename(fileName);
  const storageKey = path.posix.join('invoices', year, month, safeFileName);

  return {
    storageKey,
    absolutePath: resolveStoragePath(storageKey),
  };
};

const writeInvoiceFile = async ({ reference, generatedAt = new Date(), fileName, buffer }) => {
  const target = buildInvoiceStorageTarget({ reference, generatedAt, fileName });
  await fs.mkdir(path.dirname(target.absolutePath), { recursive: true });
  await fs.writeFile(target.absolutePath, buffer);

  return {
    ...target,
    byteSize: buffer.length,
  };
};

const readInvoiceFile = async (storageKey) => fs.readFile(resolveStoragePath(storageKey));

const invoiceFileExists = async (storageKey) => {
  try {
    await fs.access(resolveStoragePath(storageKey));
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  buildInvoiceStorageTarget,
  resolveStoragePath,
  writeInvoiceFile,
  readInvoiceFile,
  invoiceFileExists,
};
