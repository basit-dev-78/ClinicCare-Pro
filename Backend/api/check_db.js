const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('cliniccarepro');
    const users = await db.collection('users').find({}).toArray();
    console.log('Users in cliniccarepro.users:');
    console.log(JSON.stringify(users, null, 2));
    
    const dbList = await client.db().admin().listDatabases();
    console.log('\nAvailable Databases:');
    console.log(dbList.databases.map(db => db.name));
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
