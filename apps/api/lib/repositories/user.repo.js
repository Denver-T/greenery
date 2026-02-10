const db = require('../lib/db')


//Get Package List
export async function GetPackages(){
    const data = db.query('SELECT * FROM packages')
    return data;
}

