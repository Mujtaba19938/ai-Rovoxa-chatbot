# MongoDB Atlas Setup for Rovoxa

## Quick Setup

1. **Add your MongoDB Atlas connection string to `.env`:**

```env
MONGODB_URI=mongodb+srv://khananimujtaba:V3DDrEdpivKOBIyS@rovoxa.r9rvz2m.mongodb.net/?appName=Rovoxa
```

2. **Test the connection:**

```bash
npm run test:mongodb
```

This will test your MongoDB Atlas connection using the native MongoDB driver.

3. **Start the server:**

```bash
npm run server
```

The server will automatically connect to MongoDB Atlas when it starts.

## Connection Details

- **Cluster**: rovoxa.r9rvz2m.mongodb.net
- **App Name**: Rovoxa
- **Database**: Will be created automatically when first used

## Security Note

⚠️ **Important**: The connection string contains your password. Make sure:
- Never commit `.env` file to Git (it's already in `.gitignore`)
- Use environment variables in production
- Rotate your password if it's ever exposed

## Troubleshooting

If you get connection errors:

1. **Check your IP whitelist in MongoDB Atlas:**
   - Go to Network Access in MongoDB Atlas
   - Add your current IP or use `0.0.0.0/0` for development (not recommended for production)

2. **Verify your connection string:**
   - Make sure the username and password are correct
   - Check that the cluster name matches

3. **Test connection:**
   ```bash
   npm run test:mongodb
   ```

## Using the Native MongoDB Driver

The test script (`scripts/test-mongodb-connection.js`) uses the native MongoDB driver to test the connection. The main application uses Mongoose, which connects to the same MongoDB Atlas cluster.

