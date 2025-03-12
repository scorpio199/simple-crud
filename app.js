import express from 'express';
import bodyParser from 'body-parser';
import mysql from 'mysql2';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const app = express();
const port = 3000;

// Secret key for JWT
const JWT_SECRET = 'your_secret_key';

// Middleware
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',      // your db username
  password: '',      // your db password
  database: 'company' // your db name
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL database.');
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token.' });
    }
    req.user = user; // user data from the token payload
    next();
  });
}

// Login Endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Error querying the database:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    if (results.length > 0) {
      const user = results[0];

      const token = jwt.sign(
        { id: user.id, username: user.username }, // payload data
        JWT_SECRET,
        { expiresIn: '1h' } // token expiry (optional)
      );

      res.status(200).json({
        message: 'Login successful!',
        token: token
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password.' });
    }
  });
});

// CRUD - Get All Users (Protected)
app.get('/users', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM users';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error.' });
    }
    res.json(results);
  });
});

// CRUD - Get User by ID (Protected)
app.get('/users/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM users WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error.' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(results[0]);
  });
});

// CRUD - Create New User (Protected)
app.post('/users', authenticateToken, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.query(query, [username, password], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error.' });
    }
    res.status(201).json({ message: 'User created successfully.', userId: results.insertId });
  });
});

// CRUD - Update User by ID (Protected)
app.put('/users/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;

  const query = 'UPDATE users SET username = ?, password = ? WHERE id = ?';
  db.query(query, [username, password, id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error.' });
    }
    res.json({ message: 'User updated successfully.' });
  });
});

// CRUD - Delete User by ID (Protected)
app.delete('/users/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM users WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error.' });
    }
    res.json({ message: 'User deleted successfully.' });
  });
});

app.get('/filter', async (req, res) => {

  try {
    const response = await fetch('https://ogienurdiana.com/career/ecc694ce4e7f6e45a5a7912cde9fe131');
    const data = await response.json(); // Convert response to JSON
    const { name, nim, ymd } = req.query;

    // Parse the response string into an array of objects
    const rows = data.DATA.split('\n');
    const headers = rows[0].split('|');

    const dataObjects = rows.slice(1).map(row => {
      const values = row.split('|');
      return {
        [headers[0]]: values[0],
        [headers[1]]: values[1],
        [headers[2]]: values[2]
      };
    });

    // Filter the data
    const filteredData = dataObjects.filter(item => {
      const nameValue = item.NAMA || ''; // fallback to empty string
      const nameMatch = name ? nameValue.toLowerCase().includes(name.toLowerCase()) : true;
      const nimMatch = nim ? item.NIM === nim : true;
      const ymdMatch = ymd ? item.YMD === ymd : true;

      return nameMatch && nimMatch && ymdMatch;
    });

    res.json({
      filteredData
    });
    
    //console.log('Fetched Data:', data); // Log to console

    //res.json(data.DATA); // Send the data as a response (optional)
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Something went wrong!');
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
