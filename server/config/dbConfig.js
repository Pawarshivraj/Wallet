const mongoose =require('mongoose');
 mongoose.connect(process.env.mongo_url);
const connectionResult = mongoose.connection;

connectionResult.on('error',()=>{
    console.log(console,'Mongodb error')
});
connectionResult.on('connected',()=>{
    console.log('Mongoose connected successfully')
});

module.exports = connectionResult;
