const rateLimit = require('express-rate-limit');
const token = process.env.api_token;
const board_id = process.env.board_id;
const app = require(express);

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

// Delete board

const del = `
  mutation {
    board_id
  }
`;

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
