const Quote = require('../models/quotes.model');
const Counter = require('../models/counter.model');
const { logEvent } = require('../utils/events.logger');

const DISCOUNT_TYPES = ['%', '$'];

async function generateQuoteNumber(userId) {
    const counter = await Counter.findOneAndUpdate(
        { _id: 'quotes' },
        { $inc: { seq: 1 } },
        {
            new: true,
            upsert: true
        }
    );

    return `${userId}-${String(counter.seq).padStart(4, '0')}`;
}

function toNumber(value, field, options = {}) {
    const { required = false, defaultValue = null } = options;

    if (value === null || value === undefined || value === '') {
        if (required) throw new Error(`El campo "${field}" es requerido`);
        return defaultValue;
    }

    const n = Number(value);

    if (!Number.isFinite(n)) {
        throw new Error(`El campo "${field}" debe ser numérico`);
    }

    return n;
}

function toDate(value, field, required = false) {
    if (value === null || value === undefined || value === '') {
        if (required) throw new Error(`El campo "${field}" es requerido`);
        return null;
    }

    const d = new Date(value);

    if (isNaN(d.getTime())) {
        throw new Error(`El campo "${field}" no es una fecha válida`);
    }

    return d;
}

function translateDupKeyError(err) {
    if (err && err.code === 11000 && err.keyValue) {
        const field = Object.keys(err.keyValue)[0];
        return `Ya existe una cotización con el mismo valor en "${field}": ${err.keyValue[field]}`;
    }

    return null;
}

function buildProducts(products) {
    if (!Array.isArray(products) || products.length === 0) {
        throw new Error('La cotización debe contener al menos un producto');
    }

    return products.map((item, index) => {
        if (!item.name) {
            throw new Error(`El producto ${index + 1} no tiene nombre`);
        }

        const discountType = item.discountType || '%';

        if (!DISCOUNT_TYPES.includes(discountType)) {
            throw new Error(`discountType inválido en el producto ${index + 1}`);
        }

        return {
            name: String(item.name).trim(),
            description: String(item.description ?? '').trim() || null,
            price: toNumber(item.price, `products[${index}].price`, { required: true }),
            priceIVA: toNumber(item.priceIVA, `products[${index}].priceIVA`, { required: true }),
            discount: toNumber(item.discount, `products[${index}].discount`, { defaultValue: 0 }),
            discountType,
            amount: toNumber(item.amount, `products[${index}].amount`, { required: true }),
            total: toNumber(item.total, `products[${index}].total`, { required: true })
        };
    });
}

function buildPayload(body, isUpdate = false) {
    const {
        quoteNum,
        userId,
        clientName,
        companyName,
        place,
        validity,
        products,
        subtotal,
        discounts,
        IVA,
        total,
        units,
        model,
        paymentNextMonthly,
        billable,
        bankName,
        paymentMethodHolder,
        accountNumber,
        CLABE,
        comments,
        createdAt
    } = body;

    if (!isUpdate) {
        if (!userId) throw new Error('El campo "userId" es requerido');
        if (!clientName) throw new Error('El campo "clientName" es requerido');
    }

    return {
        quoteNum: quoteNum ? String(quoteNum).trim() : undefined,
        userId: String(userId ?? '').trim(),
        clientName: String(clientName ?? '').trim(),
        companyName: String(companyName ?? '').trim() || null,
        place: String(place ?? '').trim() || null,
        validity: toDate(validity, 'validity', true),
        products: buildProducts(products),
        subtotal: toNumber(subtotal, 'subtotal', { required: true }),
        discounts: toNumber(discounts, 'discounts', { defaultValue: 0 }),
        IVA: toNumber(IVA, 'IVA', { required: true }),
        total: toNumber(total, 'total', { required: true }),
        units: toNumber(units, 'units'),
        model: String(model ?? '').trim() || null,
        paymentNextMonthly: toNumber(paymentNextMonthly, 'paymentNextMonthly'),
        billable: Boolean(billable) || false,
        bankName: String(bankName ?? '').trim() || null,
        paymentMethodHolder: String(paymentMethodHolder ?? '').trim() || null,
        accountNumber: String(accountNumber ?? '').trim() || null,
        CLABE: String(CLABE ?? '').trim() || null,
        comments: String(comments ?? '').trim() || null,
        createdAt: createdAt ? new Date(createdAt) : undefined
    };
}

exports.createQuote = async (req, res) => {
    try {
        const payload = buildPayload(req.body);
        payload.quoteNum = await generateQuoteNumber(payload.userId);
        const quote = await Quote.create(payload);

        await logEvent({
            req,
            identifier: quote.quoteNum,
            collectionName: 'Cotizaciones',
            operation: 'Creación',
            document: quote
        });

        return res.status(201).json({
            message: 'Cotización creada correctamente',
            data: quote
        });
    } catch (error) {
        const dup = translateDupKeyError(error);

        if (dup) {
            return res.status(400).json({ error: dup });
        }

        return res.status(400).json({
            error: error.message || 'Error al crear la cotización'
        });
    }
};

exports.getQuotes = async (req, res) => {
    try {
        const {
            q,
            clientName,
            quoteNum,
            userId
        } = req.query;

        const filters = {};

        if (clientName)  filters.clientName = new RegExp(clientName, 'i');

        if (quoteNum) filters.quoteNum = new RegExp(quoteNum, 'i');

        if (userId) filters.userId = userId;

        if (q) {
            const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const rx = new RegExp(safe, 'i');

            filters.$or = [
                { quoteNum: rx },
                { clientName: rx },
                { companyName: rx },
                { comments: rx }
            ];
        }

        const quotes = await Quote.find(filters).sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Cotizaciones obtenidas con éxito',
            filters,
            total: quotes.length,
            data: quotes
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error al consultar cotizaciones',
            error: error.message
        });
    }
};

exports.getQuoteById = async (req, res) => {
    try {
        const quote = await Quote.findById(req.params.id);

        if (!quote) {
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }

        return res.status(200).json({
            message: 'Cotización obtenida con éxito',
            data: quote
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Error al consultar la cotización'
        });
    }
};

exports.updateQuote = async (req, res) => {
    try {
        const existing = await Quote.findById(req.params.id);

        if (!existing) return res.status(404).json({ error: 'Cotización no encontrada' });

        const payload = buildPayload({ ...existing.toObject(), ...req.body }, true);

        if (!payload.createdAt) delete payload.createdAt;

        const updated = await Quote.findByIdAndUpdate(
            req.params.id,
            payload,
            {
                new: true,
                runValidators: true
            }
        );

        await logEvent({
            req,
            identifier: updated.quoteNum,
            collectionName: 'Cotizaciones',
            operation: 'Actualización',
            document: updated
        });

        return res.status(200).json({
            message: 'Cotización actualizada correctamente',
            data: updated
        });
    } catch (error) {
        const dup = translateDupKeyError(error);

        if (dup) return res.status(400).json({ error: dup });

        return res.status(400).json({ error: error.message || 'Error al actualizar la cotización' });
    }
};

exports.deleteQuote = async (req, res) => {
    try {
        const deleted = await Quote.findByIdAndDelete(req.params.id);

        if (!deleted) return res.status(404).json({ error: 'Cotización no encontrada' });

        await logEvent({
            req,
            identifier: deleted.quoteNum,
            collectionName: 'Cotizaciones',
            operation: 'Eliminación',
            document: deleted
        });

        return res.status(200).json({
            message: 'Cotización eliminada correctamente',
            quoteId: deleted._id
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Error al eliminar la cotización'
        });
    }
};