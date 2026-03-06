const rateLimit = require('express-rate-limit');
const token = process.env.api_token;
const app = require('express');

// Rate limit implementation
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100
});
app.use(limiter);

// Fetch boards by ID (Must use POST)

const query = `
  query {
    board_id
  }
`;

// Exception handling
try { 
    fetch ("https://api.monday.com", {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization' : token
      },
      body: JSON.stringify({ query })
    })
    .then(res => res.json())
    .then(data => console.log(data));
} catch (error) {
    console.error('An error occured while fetching boards from Monday.com.', error.message);
}

// Delete board

const del = `
  mutation {
    board_id
  }
`;

try {
    fetch ("https://api.monday.com", {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization' : token
      },
      body: JSON.stringify({ del })
    })
    .then(res => res.json())
    .then(data => console.log(data));
} catch (error) {
    console.error('An error occured while deleting a board from Monday.com.', error.message);
}
