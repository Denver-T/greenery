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
    board_id {
        priority
        task
        }
  }
`;

// List users

const users = {
  "query": "{ users(limit: 50, page: 1) { id name email is_admin is_guest enabled }}"
}

// Get user by ID

const getUserById = {
  "data": "{ users(ids) { id name email title phone time_zone_identifier teams { id name } } }"
}

const inviteUser = {
  "query": "mutation { invite_user_to_account(email, user_role) {id name email } }"
}

const updateUser = {
  "query": "mutation { update_user(id, user_details: { title, phone}) { id title phone } }"
}

const deactivateUser = {
  "query": "mutation { deactivate_user(user_id) { id enabled } }"
}

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
    board_id {
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
