const express = require('express');
const morgan = require('morgan');
require('./utils/mongoConnection');
const cors = require('cors');
require('dotenv').config();


const authRoutes = require('./routers/auth.router');
const planesRouter = require('./routers/planes.router');
const userRouter = require('./routers/users.router');
const dispositivosRouter = require('./routers/dispositivos.router');
const serviciosRouter = require('./routers/servicios.router');
const clientesRouter = require('./routers/clientes.router');
const pedidosRouter = require('./routers/pedidos.router');
const devicesRouter = require('./routers/devices.router');
const eventsRouter = require('./routers/events.router');
const requestsRouter = require('./routers/requests.router');

const app = express();
const port = 3003;
// Configuración básica de CORS
const allowedOrigins = ['http://192.168.3.69:4200', 'http://localhost:4200'];

app.use(require('cookie-parser')());
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization'] // Encabezados permitidos
}));

  
app.use(morgan('dev')); //Muestra en consola el método que está siendo usado

app.get("/", (req, res) => {
    res.send("Bienvenido a Leptón API");
})

app.use(express.json({limit: '50mb'})); // Especificar que express puede usar JSON de hasta 50MB para evitar que crashee con archivos de mucho peso

app.use('/auth', authRoutes);
app.use('/planes', planesRouter);
app.use('/users', userRouter);
app.use('/dispositivos', dispositivosRouter);
app.use('/servicios', serviciosRouter);
app.use('/clientes', clientesRouter);
app.use('/pedidos', pedidosRouter);

app.use('/requests', requestsRouter);
app.use('/devices', devicesRouter);

app.use('/events', eventsRouter);

app.listen(port, ()=> {
    console.log(`Servidor iniciado en http://localhost:${port}`);
})