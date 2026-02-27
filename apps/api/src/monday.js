const rateLimit = require('express-rate-limit');
const token = process.env.api_token;

// Rate limit implementation
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100
});
app.use(limiter);

// Fetch boards by ID (Must use POST)

let query = '{ boards {name id title text} }';
fetch ("https://api.monday.com", {
  method: 'post',
  headers: {
    'Content-Type': 'application/json',
    'Authorization' : token
  },
  body: JSON.stringify({ 'query' : query })
})
.then(res => res.json())
.then(data => console.log(data));

// Delete board

let del = delete_item(board_id);
fetch ("https://api.monday.com", {
  method: 'post',
  headers: {
    'Content-Type': 'application/json',
    'Authorization' : token
  },
  body: JSON.stringify({ 'query' : post })
})
.then(res => res.json())
.then(data => console.log(data));
