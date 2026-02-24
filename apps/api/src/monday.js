let query = '{ boards (limit:5) {name id} }';
fetch ("https://api.monday.com", {
  method: 'post',
  headers: {
    'Content-Type': 'application/json',
    'Authorization' : 'MONDAY_BOARD_ID'
  },
  body: JSON.stringify({ 'query' : query })
})
.then(res => res.json())
.then(res => console.log(JSON.stringify(res, null, 2)));