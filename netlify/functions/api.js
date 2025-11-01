const { Client } = require('pg');

// Connect to Neon DB using environment variable
const connectionString = process.env.POSTGRES_CONNECTION_URL;

const client = new Client({
  connectionString,
});

let isConnected = false;

// Connect once when Lambda cold starts
async function connectClient() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectClient();

  if (event.httpMethod === 'POST') {
    // Save image URL to DB
    const body = JSON.parse(event.body);
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid imageUrl' }),
      };
    }

    try {
      await client.query('CREATE TABLE IF NOT EXISTS designs (id SERIAL PRIMARY KEY, url TEXT NOT NULL)');
      await client.query('INSERT INTO designs (url) VALUES ($1)', [imageUrl]);

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Image URL saved' }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  } else if (event.httpMethod === 'GET') {
    // Retrieve all image URLs
    try {
      await client.query('CREATE TABLE IF NOT EXISTS designs (id SERIAL PRIMARY KEY, url TEXT NOT NULL)');
      const res = await client.query('SELECT url FROM designs ORDER BY id ASC');
      const images = res.rows.map(row => row.url);

      return {
        statusCode: 200,
        body: JSON.stringify({ images }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  } else {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
};
