const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const port = 3001;

const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  //  password: '',
  database: "SafetyApp",
});

app.use(cors());
app.use(bodyParser.json());

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized - Missing Token' });
  }

  console.log(token)

  const secretKey = 'api_sekret_0456';

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).json({ success: false, message: 'Unauthorized - Invalid Token' });
    }
    req.user = decoded;

    console.log(decoded)

    next();
  });
};

const getUserByEmail = async (email) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM Persona WHERE CorreoElectronico = ?`;
    db.query(query, [email], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results[0]); 
      }
    });
  });
};

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await getUserByEmail(email);

    if (user) {
      const passwordsMatch = await bcrypt.compare(password, user.Contrasena);

      if (passwordsMatch) {
        const secretKey = 'api_sekret_0456';

        const token = jwt.sign(
          { userId: user.PersonaID, username: user.Nombre },
          secretKey,
          { expiresIn: "1h" }
        );
        res
          .status(200)
          .json({ success: true, message: "Authentication successful", token });
      } else {
        // Authentication failed
        res
          .status(401)
          .json({ success: false, message: "Authentication failed" });
      }
    } else {
      // User not found
      res.status(401).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {

    const hashedPassword = await bcrypt.hash(password, 10); 
    await db.query(
      "INSERT INTO Persona (Nombre, CorreoElectronico, Contrasena) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});


app.get("/usuarios", (req, res) => {
  db.query("SELECT * FROM Persona", (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`Servidor backend está corriendo en el puerto ${port}`);
});

app.get('/ubicaciones', verifyToken, (req, res) => {
  
  const selectQuery = 'SELECT * FROM Ubicaciones';

  db.query(selectQuery, (err, results) => {
    if (err) {
      console.error('Error retrieving data from Ubicacion:', err);
      return res.status(500).json({ success: false, message: 'Error retrieving data from Ubicacion' });
    }

    res.status(200).json({ success: true, data: results });
  });
});

app.get('/incidence', verifyToken, (req, res) => {

  const selectQuery = 'SELECT * FROM Incidencias';

  db.query(selectQuery, (err, results) => {
    if (err) {
      console.error('Error retrieving data from Ubicacion:', err);
      return res.status(500).json({ success: false, message: 'Error retrieving data from Ubicacion' });
    }

    res.status(200).json({ success: true, data: results });
  });
});

app.post('/incidence', verifyToken, (req, res) => {
  const { Tipo, Descripcion, FechaHora, UbicacionID, Latitud, Longitud } = req.body;
  const { userId } = req.user;

  const insertQuery = 'INSERT INTO Incidencias (Tipo, Descripcion, FechaHora, UbicacionID, PersonaID, Latitud, Longitud) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const values = [Tipo, Descripcion, FechaHora, UbicacionID, userId, Latitud, Longitud];

  db.query(insertQuery, values, (err, results) => {
    if (err) {
      console.error('Error creating incidence:', err);
      return res.status(500).json({ success: false, message: 'Error creating incidence' });
    }

    res.status(201).json({ success: true, message: 'Incidence created successfully' });
  });
});



