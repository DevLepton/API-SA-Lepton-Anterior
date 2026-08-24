const mongoose = require('mongoose');
const BankAccount = require('../models/bankAccounts.model');
const { logEvent } = require('../utils/events.logger');

function buildPayload(body) {
    const {
        holder,
        bankName,
        accountNumber,
        CLABE
    } = body;

    if (!holder) throw new Error('El campo "holder" es requerido');
    if (!bankName) throw new Error('El campo "bankName" es requerido');
    if (!accountNumber) throw new Error('El campo "accountNumber" es requerido');
    if (!CLABE) throw new Error('El campo "CLABE" es requerido');

    return {
        holder: String(holder).trim(),
        bankName: String(bankName).trim(),
        accountNumber: String(accountNumber).trim(),
        CLABE: String(CLABE).trim()
    };
}

exports.createBankAccount = async (req, res) => {
    try {
        const payload = buildPayload(req.body);
        const bankAccount = await BankAccount.create(payload);

        await logEvent({
            req,
            identifier: bankAccount.holder,
            collectionName: 'Cuentas bancarias',
            operation: 'Creación',
            document: bankAccount
        });

        return res.status(201).json({
            message: 'Cuenta bancaria creada correctamente',
            data: bankAccount
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message || 'Error al crear la cuenta bancaria'
        });
    }
};

exports.getBankAccounts = async (req, res) => {
    try {
        const { q } = req.query;
        const filters = {};

        if (q) {
            const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const rx = new RegExp(safe, 'i');

            filters.$or = [
                { holder: rx },
                { bankName: rx },
                { accountNumber: rx },
                { CLABE: rx }
            ];
        }

        const items = await BankAccount.find(filters);

        return res.status(200).json({
            message: 'Cuentas bancarias obtenidas con éxito',
            filters,
            total: items.length,
            data: items
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error al consultar las cuentas bancarias',
            error: error.message
        });
    }
};

exports.getBankAccountById = async (req, res) => {
    try {
        const bankAccount = await BankAccount.findById(req.params.id);

        if (!bankAccount) {
            return res.status(404).json({
                error: 'Cuenta bancaria no encontrada'
            });
        }

        return res.status(200).json({
            message: 'Cuenta bancaria obtenida con éxito',
            data: bankAccount
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Error al consultar la cuenta bancaria'
        });
    }
};

exports.updateBankAccount = async (req, res) => {
    try {
        const existing = await BankAccount.findById(req.params.id);

        if (!existing) {
            return res.status(404).json({
                error: 'Cuenta bancaria no encontrada'
            });
        }

        const payload = buildPayload({
            ...existing.toObject(),
            ...req.body
        });

        const updated = await BankAccount.findByIdAndUpdate(
            req.params.id,
            payload,
            {
                new: true,
                runValidators: true
            }
        );

        await logEvent({
            req,
            identifier: updated.holder,
            collectionName: 'Cuentas bancarias',
            operation: 'Actualización',
            document: updated
        });

        return res.status(200).json({
            message: 'Cuenta bancaria actualizada correctamente',
            data: updated
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message || 'Error al actualizar la cuenta bancaria'
        });
    }
};

exports.deleteBankAccount = async (req, res) => {
    try {
        const deleted = await BankAccount.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                error: 'Cuenta bancaria no encontrada'
            });
        }

        await logEvent({
            req,
            identifier: deleted.holder,
            collectionName: 'Cuentas bancarias',
            operation: 'Eliminación',
            document: deleted
        });

        return res.status(200).json({
            message: 'Cuenta bancaria eliminada correctamente',
            bankAccountId: deleted._id
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Error al eliminar la cuenta bancaria'
        });
    }
};

exports.deleteBankAccounts = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                error: 'Debes proporcionar al menos una cuenta bancaria para eliminar'
            });
        }

        const invalidIds = ids.filter(
            id => !mongoose.Types.ObjectId.isValid(id)
        );

        if (invalidIds.length) {
            return res.status(400).json({
                error: 'Uno o más IDs de cuentas bancarias no son válidos'
            });
        }

        const bankAccounts = await BankAccount.find({
            _id: { $in: ids }
        });

        if (!bankAccounts.length) {
            return res.status(404).json({
                error: 'No se encontraron las cuentas bancarias seleccionadas'
            });
        }

        await BankAccount.deleteMany({
            _id: { $in: ids }
        });

        for (const bankAccount of bankAccounts) {
            await logEvent({
                req,
                identifier: bankAccount.holder,
                collectionName: 'Cuentas bancarias',
                operation: 'Eliminación',
                document: bankAccount
            });
        }

        return res.status(200).json({
            message: `${bankAccounts.length} cuenta${bankAccounts.length === 1 ? '' : 's'} bancaria${bankAccounts.length === 1 ? '' : 's'} eliminada${bankAccounts.length === 1 ? '' : 's'} correctamente`,
            deletedCount: bankAccounts.length,
            bankAccountIds: bankAccounts.map(bankAccount => bankAccount._id)
        });
    } catch (error) {
        console.error('Error al eliminar cuentas bancarias:', error);

        return res.status(500).json({
            error: 'Error al eliminar las cuentas bancarias'
        });
    }
};