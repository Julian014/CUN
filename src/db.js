const mysql = require('mysql2');

// Configuración del pool de conexiones
const pool = mysql.createPool({
    host: "147.93.119.252",
    user: "root",
    password: "Q3GOz7a6ywpouiL37sNEwEbOoU7HUyjDk4w5spAqEEKyfzwakvh5sExdMRYARCLZ",
    database: "viancoapp",
    port: 3306,
    waitForConnections: true,
    connectionLimit: 100,  // Aumentado para permitir más conexiones simultáneas si es necesario
    queueLimit: 0,  // Sin límite en la cola de conexiones
    connectTimeout: 5000  // Reducido a 5 segundos para intentar conexiones más rápidas
});


module.exports = pool;