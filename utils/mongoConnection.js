const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
    .then(() => console.log('✅ Conexión exitosa a MongoDB'))
    .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

module.exports = mongoose;