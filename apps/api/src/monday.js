import { useRouter } from 'next/router';
const router = useRouter();
const rateLimit = require('express-rate-limit');
const token = process.env.api_token;
const app = require('express');

// Rate limit implementation
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100
});
app.use(limiter);

// List users
export default function User() {
  const users = {
  "query": "{ users(limit: 50, page: 1) { id name email is_admin is_guest enabled }}"
}

  try {
      fetch ("https://api.monday.com", {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : token
        },
        body: JSON.stringify({ users })
      })
      .then(res => res.json())
      .then(data => console.log(data));
  } catch (error) {
      console.error('An error occured while adding  a user.', error.message);
  }

  // Get user by ID
  const getUserById = {
    "data": "{ users(ids) { id name email title phone time_zone_identifier teams { id name } } }"
  }

  try {
      fetch ("https://api.monday.com", {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : token
        },
        body: JSON.stringify({ getUserById })
      })
      .then(res => res.json())
      .then(data => console.log(data));
  } catch (error) {
      console.error('An error occured while fetching a list of users.', error.message);
  }

  //Invite user
  const inviteUser = {
    "query": "mutation { invite_user_to_account(email user_role) {id name email } }"
  }

  try {
      fetch ("https://api.monday.com", {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : token
        },
        body: JSON.stringify({ inviteUser })
      })
      .then(res => res.json())
      .then(data => console.log(data));
  } catch (error) {
      console.error('An error occured while inviting a user.', error.message);
  }

  // Update user
  const updateUser = {
    "query": "mutation { update_user(id user_details: { title phone}) { id title phone } }"
  }

  try {
      fetch ("https://api.monday.com", {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : token
        },
        body: JSON.stringify({ updateUser })
      })
      .then(res => res.json())
      .then(data => console.log(data));
  } catch (error) {
      console.error('An error occured while updating a user.', error.message);
  }

  // Deactivate user
  const deactivateUser = {
    "query": "mutation { deactivate_user(user_id) { id enabled } }"
  }

  try {
      fetch ("https://api.monday.com", {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : token
        },
        body: JSON.stringify({ deactivateUser })
      })
      .then(res => res.json())
      .then(data => console.log(data));
  } catch (error) {
      console.error('An error occured while deactiviting a user.', error.message);
  }

  // Add user to team
  const addUserToTeam = {
    "query": "mutation { add_users_to_team(team_id user_ids) { successful_users { id name } failed_users { id } } }"
  }

  try {
      fetch ("https://api.monday.com", {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : token
        },
        body: JSON.stringify({ addUserToTeam })
      })
      .then(res => res.json())
      .then(data => console.log(data));
  } catch (error) {
      console.error('An error occured while adding a user.', error.message);
  }

  // Remove user from team
  const removeUserFromTeam = {
    "query": "mutation { add_users_to_team(team_id user_ids) { successful_users { id name } failed_users { id } } }"
  }

  try {
      fetch ("https://api.monday.com", {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : token
        },
        body: JSON.stringify({ removeUser })
      })
      .then(res => res.json())
      .then(data => console.log(data));
  } catch (error) {
      console.error('An error occured while removing a user.', error.message);
  }
  } 

  const pushToUsers = () => {
    router.push('/routes/users')
  }

// Fetch boards by ID (Must use POST)
const query = `
  query {
    board_id {
        priority
        task
        }
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
