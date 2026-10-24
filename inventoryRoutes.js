// FARK 618 Inventory modules: TransferCheck + StockTake
// Mount in server.js AFTER checkAdmin is declared and after mongoose is connected:
// const createInventoryRouter = require('./inventoryRoutes');
// app.use('/admin/inventory', createInventoryRouter({ checkAdmin }));
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const XLSX = require('xlsx');
const { getAccessToken } = require('./zoho');

const STORE_IDS = {
  KMT: process.env.ZOHO_LOCATION_KMT,
  RSP: process.env.ZOHO_LOCATION_RSP,
  FRM: process.env.ZOHO_LOCATION_FRM,
  AFS: process.env.ZOHO_LOCATION_AFS
};
const orgId = () => process.env.ZOHO_ORGANIZATION_ID;
const collectionSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const TransferCheck = mongoose.models.TransferCheck || mongoose.model('TransferCheck', collectionSchema, 'transfer_checks');
const StockTakeSession = mongoose.models.StockTakeSession || mongoose.model('StockTakeSession', collectionSchema, 'stocktake_sessions');

function safeQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) throw new Error('Quantity must be a non-negative whole number');
  return n;
}
function statusFor(expected, actual) {
  if (actual === 0 && expected > 0) return 'Pending';
  if (actual < expected) return 'Shortage';
  if (actual > expected) return 'Excess';
  return 'Matched';
}
async function zohoGet(url, params = {}) {
  if (!orgId()) throw Object.assign(new Error('ZOHO_ORGANIZATION_ID is missing'), { status: 500 });
  const token = await getAccessToken();
  const response = await axios.get(url, {
    params: { organization_id: orgId(), ...params },
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    timeout: 25000
  });
  if (response.data?.code && response.data.code !== 0) throw new Error(response.data.message || 'Zoho API error');
  return response.data;
}
function handleError(res, err) {
  console.error(
    'Inventory module error:',
    JSON.stringify(err.response?.data || err.message)
  );

  res.status(err.status || err.response?.status || 500).json({
    success: false,
    message:
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Inventory request failed',
    details: err.response?.data || null
  });
}

module.exports = function createInventoryRouter({ checkAdmin }) {
  if (typeof checkAdmin !== 'function') throw new Error('checkAdmin middleware is required');
  const router = express.Router();
  router.use(checkAdmin);

  // Fetch real Zoho Transfer Orders; does not claim physical receipt is verified.
  router.get('/transfer-orders', async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const perPage = Math.min(200, Math.max(1, Number(req.query.per_page) || 50));
      const data = await zohoGet('https://www.zohoapis.in/inventory/v1/transferorders', { page, per_page: perPage });
      const orders = (data.transfer_orders || []).map(o => ({
        transferOrderId: String(o.transfer_order_id), transferOrderNo: o.transfer_order_number,
        date: o.date, status: o.status, fromStore: o.from_location_name || '', toStore: o.to_location_name || '',
        fromLocationId: String(o.from_location_id || ''), toLocationId: String(o.to_location_id || ''),
        totalQuantity: Number(o.total_quantity || 0)
      }));
      res.json({ success: true, page, perPage, orders });
    } catch (err) { handleError(res, err); }
  });

  router.get('/transfer-orders/:id', async (req, res) => {
    try {
      const data = await zohoGet(`https://www.zohoapis.in/inventory/v1/transferorders/${encodeURIComponent(req.params.id)}`);
      const o = data.transfer_order;
      if (!o) return res.status(404).json({ success: false, message: 'Transfer Order not found' });
      res.json({ success: true, transferOrder: o });
    } catch (err) { handleError(res, err); }
  });

  // Persist barcode-by-barcode physical verification for a transfer order.
  router.post('/transfer-checks', async (req, res) => {
    try {
      const { transferOrderId, transferOrderNo, fromStore, toStore, lines } = req.body || {};
      if (!transferOrderId || !Array.isArray(lines) || !lines.length) return res.status(400).json({ success: false, message: 'transferOrderId and non-empty lines are required' });
      const normalized = lines.map(line => {
        const barcode = String(line.barcode || line.sku || '').trim();
        if (!barcode) throw new Error('Every line requires barcode or SKU');
        const expectedQty = safeQty(line.expectedQty);
        const receivedQty = safeQty(line.receivedQty);
        return { barcode, sku: String(line.sku || barcode), name: String(line.name || ''), expectedQty, receivedQty, status: statusFor(expectedQty, receivedQty) };
      });
      const doc = await TransferCheck.findOneAndUpdate(
        { transferOrderId: String(transferOrderId) },
        { $set: { transferOrderId: String(transferOrderId), transferOrderNo: String(transferOrderNo || ''), fromStore: String(fromStore || ''), toStore: String(toStore || ''), lines: normalized, status: normalized.every(x => x.status === 'Matched') ? 'Matched' : normalized.some(x => x.status === 'Pending') ? 'Pending' : 'Variance', verifiedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      res.json({ success: true, check: doc });
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
  });
  router.get('/transfer-checks', async (req, res) => {
    try {
      const filter = {};
      if (req.query.fromStore) filter.fromStore = req.query.fromStore;
      if (req.query.toStore) filter.toStore = req.query.toStore;
      if (req.query.status) filter.status = req.query.status;
      const checks = await TransferCheck.find(filter).sort({ updatedAt: -1 }).limit(500).lean();
      res.json({ success: true, checks });
    } catch (err) { handleError(res, err); }
  });

  // Store-wise stocktake session; scan counts are saved in MongoDB, not browser-only storage.
  router.post('/stocktakes', async (req, res) => {
    try {
      const { store, mode = 'blind', lines = [], title = '' } = req.body || {};
      if (!['FRM','AFS','RSP','KMT'].includes(store)) return res.status(400).json({ success: false, message: 'Invalid store. Use FRM, AFS, RSP or KMT.' });
      if (!['blind','compare'].includes(mode)) return res.status(400).json({ success: false, message: 'mode must be blind or compare' });
      if (!Array.isArray(lines)) return res.status(400).json({ success: false, message: 'lines must be an array' });
      const normalized = lines.map(line => {
        const barcode = String(line.barcode || line.sku || '').trim();
        if (!barcode) throw new Error('Every line requires barcode or SKU');
        const countedQty = safeQty(line.countedQty);
        const expectedQty = line.expectedQty === undefined || line.expectedQty === null || line.expectedQty === '' ? null : safeQty(line.expectedQty);
        return { barcode, sku: String(line.sku || barcode), name: String(line.name || ''), countedQty, expectedQty, variance: expectedQty === null ? null : countedQty - expectedQty, status: expectedQty === null ? 'Counted' : statusFor(expectedQty, countedQty) };
      });
      const session = await StockTakeSession.create({ store, mode, title: String(title), lines: normalized, status: 'In Progress', startedAt: new Date(), createdBy: req.user?.username || 'admin' });
      res.status(201).json({ success: true, session });
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
  });
  router.get('/stocktakes', async (req, res) => {
    try {
      const filter = {};
      if (req.query.store && ['FRM','AFS','RSP','KMT'].includes(req.query.store)) filter.store = req.query.store;
      const sessions = await StockTakeSession.find(filter).sort({ createdAt: -1 }).limit(500).lean();
      res.json({ success: true, sessions });
    } catch (err) { handleError(res, err); }
  });
  router.get('/stocktakes/:id', async (req, res) => {
    try {
      const session = await StockTakeSession.findById(req.params.id).lean();
      if (!session) return res.status(404).json({ success: false, message: 'StockTake session not found' });
      res.json({ success: true, session });
    } catch (err) { handleError(res, err); }
  });
  router.patch('/stocktakes/:id', async (req, res) => {
    try {
      const { lines, status } = req.body || {};
      const update = {};
      if (Array.isArray(lines)) update.lines = lines.map(line => {
        const barcode = String(line.barcode || line.sku || '').trim();
        if (!barcode) throw new Error('Every line requires barcode or SKU');
        const countedQty = safeQty(line.countedQty);
        const expectedQty = line.expectedQty === undefined || line.expectedQty === null || line.expectedQty === '' ? null : safeQty(line.expectedQty);
        return { barcode, sku: String(line.sku || barcode), name: String(line.name || ''), countedQty, expectedQty, variance: expectedQty === null ? null : countedQty - expectedQty, status: expectedQty === null ? 'Counted' : statusFor(expectedQty, countedQty) };
      });
      if (status !== undefined) {
        if (!['In Progress','Completed','Cancelled'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid session status' });
        update.status = status;
        if (status === 'Completed') update.completedAt = new Date();
      }
      const session = await StockTakeSession.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
      if (!session) return res.status(404).json({ success: false, message: 'StockTake session not found' });
      res.json({ success: true, session });
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
  });

  router.get('/reports/stocktake.csv', async (req, res) => {
    try {
      const filter = {};
      if (req.query.store && ['FRM','AFS','RSP','KMT'].includes(req.query.store)) filter.store = req.query.store;
      const sessions = await StockTakeSession.find(filter).sort({ createdAt: -1 }).lean();
      const rows = [];
      for (const s of sessions) for (const l of (s.lines || [])) rows.push({ SessionId: String(s._id), Store: s.store, Date: s.createdAt, Status: s.status, Barcode: l.barcode, SKU: l.sku, Product: l.name, ExpectedQty: l.expectedQty ?? '', CountedQty: l.countedQty, Variance: l.variance ?? '', Result: l.status });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'StockTake');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="FARK618-StockTake-Report.xlsx"');
      res.send(buffer);
    } catch (err) { handleError(res, err); }
  });
  return router;
};
