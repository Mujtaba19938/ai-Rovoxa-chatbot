/**
 * MongoDB Atlas Connection Test Script
 * Tests the connection to MongoDB Atlas using the native MongoDB driver
 */

import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb+srv://khananimujtaba:V3DDrEdpivKOBIyS@rovoxa.r9rvz2m.mongodb.net/?appName=Rovoxa";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB Atlas!");
    
    // Get database info
    const db = client.db();
    const collections = await db.listCollections().toArray();
    
    console.log(`📊 Database: ${db.databaseName}`);
    console.log(`📁 Collections: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log('   Collections found:');
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error);
    process.exit(1);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
    console.log('🔌 Connection closed.');
  }
}

run().catch(console.dir);

