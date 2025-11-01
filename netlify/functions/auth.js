const { Client } = require('pg');

const connectionString = process.env.POSTGRES_CONNECTION_URL;

const client = new Client({ connectionString });

let isConnected = false;

async function connectClient() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
}

exports.handler = async (event) => {
  try {
    await connectClient();

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Only POST allowed' }),
      };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { action } = body;

    if (action === 'signup') {
      const { fullName, username, password } = body;

      if (!fullName || !username || !password) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
      }

      // Create users table if not exists
      await client.query(
        `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          fullname TEXT NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL
        )`
      );

      // Check if username exists
      const userCheck = await client.query('SELECT 1 FROM users WHERE username = $1', [username]);
      if (userCheck.rowCount > 0) {
        return { statusCode: 409, body: JSON.stringify({ error: 'Username already taken' }) };
      }

      // Insert new user
      await client.query('INSERT INTO users (fullname, username, password) VALUES ($1, $2, $3)', [fullName, username, password]);

      return { statusCode: 200, body: JSON.stringify({ message: 'User registered successfully' }) };

    } else if (action === 'signin') {
      const { username, password } = body;

      if (!username || !password) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing username or password' }) };
      }

      // Find user with matching username and password
      const res = await client.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);

      if (res.rowCount === 1) {
        return { statusCode: 200, body: JSON.stringify({ message: 'Sign in successful' }) };
      } else {
        return { statusCode: 401, body: JSON.stringify({ error: 'Invalid username or password' }) };
      }
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) };
    }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
