const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName : {type : String, required : true },
    email : {type : String, required : true, unique : true},
    password : {type : String, required : true},
    role : {type : String, required : true, enum: ['admin', 'soporte', 'finanzas', 'inventario']},
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema, 'users');

module.exports = User;