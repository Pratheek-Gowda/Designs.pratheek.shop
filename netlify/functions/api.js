const { Client } = require('pg');

const connectionString = process.env.POSTGRES_CONNECTION_URL;

const client = new Client({
  connectionString,
});

let isConnected = false;

async function connectClient() {
  if (!isConnected) {
    try {
      await client.connect();
      isConnected = true;
    } catch (err) {
      console.error('Database connection error:', err);
      throw err;
    }
  }
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectClient();

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const { imageUrl } = body;

      if (!imageUrl || typeof imageUrl !== 'string') {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid or missing imageUrl in request body' }),
        };
      }

      // Ensure table exists
      await client.query('CREATE TABLE IF NOT EXISTS designs (id SERIAL PRIMARY KEY, url TEXT NOT NULL)');

      // Insert the image URL into the database
      await client.query('INSERT INTO designs (url) VALUES ($1)', [imageUrl]);

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Image URL saved successfully' }),
      };

    } else if (event.httpMethod === 'GET') {
      // Ensure table exists
      await client.query('CREATE TABLE IF NOT EXISTS designs (id SERIAL PRIMARY KEY, url TEXT NOT NULL)');

      // Select all image URLs
      const res = await client.query('SELECT url FROM designs ORDER BY id ASC');

      const images = res.rows.map(row => row.url);

      return {
        statusCode: 200,
        body: JSON.stringify({ images }),
      };
    } else {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed. Use GET or POST.' }),
      };
    }
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};
