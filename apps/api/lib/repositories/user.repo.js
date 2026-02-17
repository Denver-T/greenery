const db = require('../db')


//Get Package List
const GetPackages = async () =>{
    const [data] = await db.query('SELECT * FROM packages')
    return data;
}

module.exports ={
    GetPackages
}

