// Importaciones principales
const express = require("express");
const session = require("express-session");
const mysql = require("mysql2");
const { engine } = require("express-handlebars");
const multer = require('multer');
const hbs = require('handlebars');
const { JSDOM } = require('jsdom');
const bodyParser = require('body-parser');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const path = require('path');
const pool = require('./db');
const db = require('./app');
const webhookHandler = require("./webhook/webhookHandler");
const loginRoutes = require("./routes/login");
const app = express();
const http = require("http");
const socketIo = require("socket.io");
const router = express.Router();
const server = http.createServer(app);      // ✅ PRIMERO creas el server
const io = socketIo(server); // ✅ Ya puedes usar `server` aquí
app.set("port", process.env.PORT || 3000);
app.set("views", __dirname + "/views");
app.use(router);
process.env.TZ = 'America/Bogota';
app.set('view engine', 'hbs');
app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use('manifest.json', express.static('manifest.json'));
app.post("/webhook", webhookHandler.handleWebhook);
app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
const axios = require('axios');



// Configuración de almacenamiento en memoria (buffer) y límite de tamaño del archivo
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Límite de tamaño de archivo: 10 MB
});







// Middleware to protect routes that require authentication
function requireLogin(req, res, next) {
    if (req.session.loggedin) {
        next();  // Pasar al siguiente middleware si está autenticado
    } else {
        res.redirect("/loginempresa");  // Redirigir a la página de inicio de sesión si no está autenticado
    }
}

app.use((req, res, next) => {
    req.db = pool;
    next();
});

app.use(session({
    secret: "secret",
    resave: true,
    saveUninitialized: true
}));




const cors = require('cors');
app.use(cors({
  origin: '*' // Permitir solicitudes de cualquier origen (cambiar en producción)
}));

app.use(cors());






app.get("/login", (req, res) => {
    if (req.session.loggedin) {
        res.redirect("/menu");  // Redirigir a la página principal si ya está autenticado
    } else {
        res.render("login/index.hbs", { error: null });  // Renderizar el formulario de inicio de sesión con un mensaje de error nulo
    }
});





hbs.registerHelper('eq', (a, b) => a == b);






// Ruta de autenticación
app.post("/auth", (req, res) => {
    const { email, password } = req.body;

    pool.query("SELECT * FROM usuarios_cun WHERE email = ? AND password = ?", [email, password], (err, userData) => {
        if (err) {
            console.error("Error fetching user from database:", err);
            res.status(500).send("Internal Server Error");
            return;
        }

        if (userData.length > 0) {
            const user = userData[0];
            req.session.loggedin = true;
            req.session.name = user.name;
            req.session.userId = user.id; // Guardar el ID del usuario en la sesión
            req.session.role = user.roles; // ✅ AQUÍ debes guardar el rol
            req.session.user = user; // Guardar el objeto usuario completo en la sesión para uso posterior
            res.redirect("/menu");
        } else {
            res.render("/", { error: "Usuario no encontrado o contraseña incorrecta" });
        }
    });
});







// Handle logout
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error destroying session:", err);  // Manejar errores al destruir la sesión
            res.status(500).send("Internal Server Error");  // Enviar respuesta de error interno del servidor
        } else {
            res.redirect("/");  // Redirigir a la página de inicio de sesión después de cerrar sesión
        }
    });
});


// Render login form
app.get("/", (req, res) => {
    if (req.session.loggedin) {
        res.redirect("/");  // Redirigir a la página principal si ya está autenticado
    } else {
        res.render("login/loginempresa.hbs", { error: null });  // Renderizar el formulario de inicio de sesión con un mensaje de error nulo
    }
});




app.engine('hbs', engine({
    extname: '.hbs',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials'),
    defaultLayout: false // 👈 Esto evita que busque main.hbs
  }));
  


  app.get("/menu", (req, res) => {
    if (req.session.loggedin) {
        console.log(`🟢 Usuario logueado - ID: ${req.session.userId}, Nombre: ${req.session.name}, Rol: ${req.session.role}`);

        res.render("home/home.hbs", {
            showNav: true,
            name: req.session.name,
            idUsuario: req.session.userId,
            role: req.session.role,
            layout: "principal",
        });
    } else {
        res.redirect("/");
    }
});






app.get('/iniciarturnoo', (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        res.render('contabilidadyfinanzas/Recursos_humanos/EMPLEADOS/inciar_turno.hbs', { 
            navopertaivo: true,
             nombreUsuario 
            });
    } else {
        res.redirect('/');
    }
});






// Endpoint para guardar la ubicación
app.post('/guardar-ubicacion', async (req, res) => {
    const { userId, latitude, longitude } = req.body;
  
    if (!userId || !latitude || !longitude) {
      return res.status(400).send({ error: 'Todos los campos son requeridos' });
    }
  
    try {
      await db.query(
        'INSERT INTO ubicaciones (user_id, latitude, longitude, fecha) VALUES (?, ?, ?, NOW())',
        [userId, latitude, longitude]
      );
      res.send({ success: true, message: 'Ubicación guardada correctamente' });
    } catch (error) {
      console.error('Error al guardar ubicación:', error);
      res.status(500).send({ error: 'Error interno del servidor' });
    }
  });



// Ruta para listar usuarios
app.get('/api/users', async (req, res) => {
    try {
        // Consulta a la base de datos
        const [users] = await db.query('SELECT id, name FROM usuarios_cun');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
});



// Ruta para iniciar un turno
app.post('/api/turnos/iniciar', async (req, res) => {
    const { user_id, latitud, longitud, rango } = req.body;

    if (!user_id || !latitud || !longitud || !rango) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    try {
        // Consulta para insertar el inicio de turno
        const query = `
            INSERT INTO horario_estudiantes (ejecutivo_id, fecha_inicio, latitud, longitud, rango, estado)
            VALUES (?, NOW(), ?, ?, ?, 'activo')
        `;
        const values = [user_id, latitud, longitud, rango];

        const [result] = await db.query(query, values);
        res.status(201).json({ message: 'Turno iniciado con éxito', turno_id: result.insertId });
    } catch (error) {
        console.error('Error al iniciar turno:', error);
        res.status(500).json({ message: 'Error al iniciar turno' });
    }
});


app.get('/Agregar_turno', (req, res) => {
    if (req.session.loggedin === true) {
        const userId = req.session.userId;
        pool.query('SELECT id, name FROM usuarios_cun WHERE id = ?', [userId], (error, results) => {
            if (error) {
                console.error('Error al obtener usuario:', error);
                return res.status(500).send('Error al cargar la página');
            }

            const nombreUsuario = req.session.name;

            res.render('contabilidadyfinanzas/Recursos_humanos/EMPLEADOS/crear_inicio_turno.hbs', {
                nombreUsuario,
                layout: "principal",
                usuarios: results,
                role: req.session.role

            });
        });
    } else {
        res.redirect('/');
    }
});





app.post('/guardar_turno', (req, res) => {
    const {
        user_id,
        latitud,
        longitud,
        rango,
        lunes_entrada,
        lunes_salida,
        martes_entrada,
        martes_salida,
        miercoles_entrada,
        miercoles_salida,
        jueves_entrada,
        jueves_salida,
        viernes_entrada,
        viernes_salida,
        sabado_entrada,
        sabado_salida,
        domingo_entrada,
        domingo_salida
    } = req.body;

    if (!user_id || !latitud || !longitud || !rango) {
        return res.status(400).send('Todos los campos principales son obligatorios');
    }

    // Verificar si el user_id ya existe en la tabla turnos
    const checkQuery = 'SELECT COUNT(*) AS count FROM turnos WHERE user_id = ?';
    pool.query(checkQuery, [user_id], (error, results) => {
        if (error) {
            console.error('Error al verificar el user_id:', error);
            return res.status(500).send('Error al verificar el user_id');
        }

        if (results[0].count > 0) {
            return res.status(400).send('Este user_id ya tiene un turno registrado');
        }

        // Si no existe, proceder con la inserción
        const query = `
            INSERT INTO horario_estudiantes (
                user_id, latitud, longitud, rango,
                lunes_entrada, lunes_salida,
                martes_entrada, martes_salida,
                miercoles_entrada, miercoles_salida,
                jueves_entrada, jueves_salida,
                viernes_entrada, viernes_salida,
                sabado_entrada, sabado_salida,
                domingo_entrada, domingo_salida,
                estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
        `;
        const values = [
            user_id, latitud, longitud, rango,
            lunes_entrada, lunes_salida,
            martes_entrada, martes_salida,
            miercoles_entrada, miercoles_salida,
            jueves_entrada, jueves_salida,
            viernes_entrada, viernes_salida,
            sabado_entrada, sabado_salida,
            domingo_entrada, domingo_salida
        ];

        pool.query(query, values, (error, results) => {
            if (error) {
                console.error('Error al guardar el turno:', error);
                return res.status(500).send('Error al guardar el turno');
            }

            res.redirect('/Agregar_turno');
        });
    });
});



app.get('/inicio_labores', async (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        const userId = req.session.userId;

        try {
            const hoy = new Date();
            const fechaLocal = hoy.toLocaleDateString('en-GB').split('/').reverse().join('-'); // Formato YYYY-MM-DD

            console.log("Fecha actual:", fechaLocal); // Verificar la fecha actual

            const [turnoIniciado] = await pool.promise().query(
                "SELECT COUNT(*) AS count FROM registro_estudiantes WHERE user_id = ? AND DATE(fecha_inicio) = ?",
                [userId, fechaLocal]
            );

            const [turnoCerrado] = await pool.promise().query(
                "SELECT COUNT(*) AS count FROM registro_estudiantes WHERE user_id = ? AND DATE(fecha_inicio) = ? AND fecha_cierre IS NOT NULL",
                [userId, fechaLocal]
            );

            console.log("Turno iniciado:", turnoIniciado[0].count);
            console.log("Turno cerrado:", turnoCerrado[0].count);

            const mostrarBotonIniciar = turnoIniciado[0].count === 0; // Si no se ha iniciado un turno hoy
            const mostrarBotonFinalizar = turnoIniciado[0].count > 0 && turnoCerrado[0].count === 0; // Si se ha iniciado pero no se ha cerrado

            console.log("mostrarBotonIniciar:", mostrarBotonIniciar);
            console.log("mostrarBotonFinalizar:", mostrarBotonFinalizar);

            res.render('contabilidadyfinanzas/Recursos_humanos/EMPLEADOS/inicio_labores.hbs', {
                nombreUsuario,
                userId,
                layout: "principal",
                mostrarBotonIniciar,
                mostrarBotonFinalizar,
                role: req.session.role
            });

        } catch (error) {
            console.error("Error al verificar registros de turnos:", error);
            res.status(500).send("Error en el servidor.");
        }
    } else {
        res.redirect("/");
    }
});








function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371008.8; // Radio medio de la Tierra en metros
    const toRadians = (degrees) => degrees * (Math.PI / 180);

    const deltaLat = toRadians(lat2 - lat1);
    const deltaLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(deltaLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en metros
}





app.post("/turnos/:action", async (req, res) => {
    const { action } = req.params;
    const { user_id, latitud, longitud } = req.body;

    if (!["iniciar", "cerrar"].includes(action)) {
        return res.status(400).json({ error: "Acción inválida. Use 'iniciar' o 'cerrar'." });
    }

    try {
        const [turnoConfig] = await pool.promise().query(
            "SELECT latitud, longitud, rango, martes_entrada FROM horario_estudiantes WHERE user_id = ?",
            [user_id]
        );

        if (turnoConfig.length === 0) {
            return res.status(404).json({ error: "Usuario no tiene configuración de turno." });
        }

        const { latitud: latAsignada, longitud: lonAsignada, rango, martes_entrada } = turnoConfig[0];

        // Calcular distancia
        const distancia = calculateDistance(
            parseFloat(latitud),
            parseFloat(longitud),
            parseFloat(latAsignada),
            parseFloat(lonAsignada)
        );

        const margen = 5; // Margen adicional en metros
        if (distancia > parseFloat(rango) + margen) {
            return res.status(400).json({
                error: `Ubicación fuera del rango permitido. Distancia actual: ${distancia.toFixed(2)} metros.`,
            });
        }

        // Obtener fecha y hora actual en Bogotá
        const timestamp = new Date(); // Hora y fecha local en Bogotá
        const hoy = timestamp.toLocaleDateString("en-GB").split('/').reverse().join('-'); // Fecha en formato YYYY-MM-DD
        const horaActual = timestamp.toTimeString().split(" ")[0]; // Hora en formato HH:MM:SS
        
        console.log("Fecha actual:", hoy);  // Depuración
        console.log("Hora actual:", horaActual);  // Depuración

        if (action === "iniciar") {
            const [turnoHoy] = await pool.promise().query(
                "SELECT COUNT(*) AS count FROM registro_estudiantes WHERE user_id = ? AND DATE(fecha_inicio) = ?",
                [user_id, hoy]
            );

            if (turnoHoy[0].count > 0) {
                return res.status(400).json({
                    error: "Ya has iniciado un turno hoy. No puedes iniciar otro.",
                });
            }

            await pool.promise().query(
                "INSERT INTO registro_estudiantes (user_id, fecha_inicio, hora_inicio) VALUES (?, ?, ?)",
                [user_id, hoy, horaActual]
            );

            return res.json({ message: "Turno iniciado correctamente." });
        } else if (action === "cerrar") {
            const [turnoIniciado] = await pool.promise().query(
                "SELECT fecha_inicio, hora_inicio FROM registro_estudiantes WHERE user_id = ? AND fecha_cierre IS NULL",
                [user_id]
            );

            if (turnoIniciado.length === 0) {
                return res.status(400).json({ error: "No hay turno iniciado para cerrar." });
            }

            const horaInicio = new Date(`${hoy}T${turnoIniciado[0].hora_inicio}`);

            // Hora actual (hora de cierre)
            const horaFinal = new Date(`${hoy}T${horaActual}`);

            // Diferencia en milisegundos
            const diferenciaMs = horaFinal - horaInicio;

            // Convertir diferencia en horas y minutos
            const horasTrabajadas = Math.floor(diferenciaMs / (1000 * 60 * 60)); // Horas completas
            const minutosTrabajados = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60)); // Minutos restantes

            // Actualizar en la base de datos
            const [updateResult] = await pool.promise().query(
                "UPDATE registro_estudiantes SET fecha_cierre = ?, hora_final = ?, horas = ?, minutos_extra = ? WHERE user_id = ? AND fecha_cierre IS NULL",
                [hoy, horaActual, horasTrabajadas, minutosTrabajados, user_id]
            );

            if (updateResult.affectedRows === 0) {
                return res.status(400).json({ error: "Error al cerrar el turno." });
            }

            return res.json({
                message: `Turno cerrado con éxito.`,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor." });
    }
});



app.get('/reporte_horario', (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;

        // Consulta para obtener todos los datos de registro_estudiantes  junto con el nombre del usuario
        const query = `
            SELECT 
                rt.id,
                rt.user_id,
                u.name AS nombre_usuario, -- Obtén el nombre del usuario
                rt.fecha_inicio,
                rt.fecha_cierre,
                rt.horas,
                rt.hora_inicio,
                rt.hora_final
            FROM registro_estudiantes  rt
            INNER JOIN usuarios_cun u ON rt.user_id = u.id -- Relación entre las tablas
            ORDER BY rt.fecha_inicio DESC;
        `;

        // Ejecutar la consulta
        pool.query(query, (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error en la consulta');
            } else {
                res.render('contabilidadyfinanzas/Recursos_humanos/EMPLEADOS/reporte_horario.hbs', {
                    navopertaivo: true,
                    
                    nombreUsuario,
                    reporte: result // Los resultados de la consulta con los nombres
                });
            }
        });
    } else {
        res.redirect('/');
    }
});




app.get('/api/horarios/:diaSemana/:userId', (req, res) => {
    const { diaSemana, userId } = req.params;
    const query = `
        SELECT ${diaSemana}_entrada AS entrada, ${diaSemana}_salida AS salida 
        FROM turnos WHERE user_id = ?`;
    pool.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener horarios' });
        res.json(results[0]);
    });
});





app.get('/estadisticas_horario', (req, res) => {
    if (req.session.loggedin === true) {
        const nombreUsuario = req.session.name;
        res.render('contabilidadyfinanzas/Recursos_humanos/EMPLEADOS/estadisticas_horario.hbs', { navopertaivo: true, nombreUsuario });
    } else {
        res.redirect('/');
    }
});





app.post('/estadisticas_horario', (req, res) => {
    if (req.session.loggedin === true) {
        const { fechaInicio, fechaFin } = req.body;

        // Consulta todos los registros de turnos para el rango de fechas
        pool.query(`
            SELECT 
                user_id,
                fecha_inicio,
                hora_inicio,
                hora_final
            FROM 
                registro_estudiantes 
            WHERE 
                fecha_inicio BETWEEN ? AND ?;
        `, [fechaInicio, fechaFin], (err, registros) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error al obtener los registros.');
            }

            console.log(registros); // Verificar que los registros se obtienen correctamente

            const nombreUsuario = req.session.name;
            res.render('contabilidadyfinanzas/Recursos_humanos/EMPLEADOS/estadisticas_horario.hbs', { 
                navopertaivo: true, 
                nombreUsuario, 
                registros,
                fechaInicio,
                fechaFin
            });
        });
    } else {
        res.redirect('/');
    }
});



const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor Express y Socket.IO escuchando en el puerto ${PORT}`);
});