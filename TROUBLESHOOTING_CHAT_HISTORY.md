# Troubleshooting Chat History "Failed to fetch chats" Error

## 🔍 Diagnostic Steps

### Step 1: Check Backend Console Logs

Look for these log messages in your backend server console:

```
🔍 [CHAT HISTORY] Request received
🔍 [CHAT HISTORY] User ID extracted: <user-id>
🔍 [CHAT HISTORY] Supabase client available
❌ [CHAT HISTORY] Database error fetching chats: <error details>
```

**What to look for:**
- If you see `TABLE_NOT_FOUND` or error code `42P01` → Tables don't exist
- If you see `RLS_PERMISSION_ERROR` or error code `42501` → RLS policy issue
- If you see connection errors → Supabase URL/key incorrect

### Step 2: Check Health Endpoint

Visit: `http://localhost:5000/api/health`

**Expected response:**
```json
{
  "ok": true,
  "database": {
    "status": "connected",
    "tableExists": true
  },
  "supabase": {
    "url": "configured",
    "serviceKey": "configured"
  }
}
```

**If `tableExists: false`:**
- Run `supabase-schema.sql` in your Supabase SQL Editor
- See "Step 3" below

**If `status: "error"`:**
- Check the `error` field in the response for details
- Verify your Supabase credentials

### Step 3: Verify Supabase Tables Exist

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run this query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chats', 'messages');
```

**Expected result:** Should return 2 rows (chats, messages)

**If tables don't exist:**
1. Copy the contents of `supabase-schema.sql`
2. Paste into Supabase SQL Editor
3. Click "Run"
4. Verify tables were created

### Step 4: Verify Environment Variables

Check your backend `.env` file has:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**To get these values:**
1. Go to Supabase Dashboard
2. Project Settings → API
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### Step 5: Check RLS Policies

The service role key should **bypass RLS automatically**. However, if you're getting permission errors:

1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Policies**
3. Check that policies exist for `chats` and `messages` tables
4. If using service role, RLS should be bypassed, but verify policies are correct

### Step 6: Test Database Connection

In your backend console, you should see:
```
✅ Supabase configured
```

If you see:
```
❌ Missing Supabase credentials in environment
```

→ Your `.env` file is missing or not loaded

---

## 🐛 Common Error Codes & Solutions

### Error Code: `42P01` - Table Not Found
**Solution:** Run `supabase-schema.sql` in Supabase SQL Editor

### Error Code: `42501` - Permission Denied
**Solution:** 
- Verify you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- Service role should bypass RLS automatically
- Check Supabase project settings

### Error: "Database connection failed"
**Solution:**
- Verify `SUPABASE_URL` is correct (should be `https://xxx.supabase.co`)
- Check internet connection
- Verify Supabase project is active

### Error: "Failed to fetch chats"
**Solution:**
- Check backend console for detailed error
- Verify tables exist (Step 3)
- Check environment variables (Step 4)

---

## 🔧 Quick Fixes

### Fix 1: Tables Don't Exist
```bash
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy contents of supabase-schema.sql
# 3. Paste and run in SQL Editor
# 4. Restart backend server
```

### Fix 2: Wrong Environment Variables
```bash
# 1. Check .env file exists in project root
# 2. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
# 3. Restart backend server (env vars loaded on startup)
```

### Fix 3: Service Role Key Issue
```bash
# 1. Go to Supabase Dashboard → Project Settings → API
# 2. Copy the service_role key (not anon key!)
# 3. Update .env file
# 4. Restart backend server
```

---

## 📊 Expected Backend Logs (Success)

When working correctly, you should see:

```
🔍 [CHAT HISTORY] Request received
🔍 [CHAT HISTORY] User ID extracted: abc123...
🔍 [CHAT HISTORY] Supabase client available
🔍 [CHAT HISTORY] Supabase connection test passed
🔍 [CHAT HISTORY] Querying chats for user: abc123...
🔍 [CHAT HISTORY] Chats query result: { count: 0, hasData: true }
✅ [CHAT HISTORY] No chats found for user - returning empty array
```

OR if chats exist:

```
🔍 [CHAT HISTORY] Chats query result: { count: 3, hasData: true }
🔍 [CHAT HISTORY] Fetching messages for chat IDs: [...]
✅ [CHAT HISTORY] Success - returning: { messagesCount: 10, chatsCount: 3 }
```

---

## 🆘 Still Not Working?

1. **Check backend console** - Look for `[CHAT HISTORY]` or `[AUTH]` logs
2. **Check browser console** - Look for `[FRONTEND]` logs
3. **Test health endpoint** - `http://localhost:5000/api/health`
4. **Verify Supabase project** - Make sure project is active and not paused
5. **Check network tab** - See the actual HTTP response from backend

---

## 📝 Next Steps After Fix

Once fixed, you should see:
- ✅ Backend logs showing successful queries
- ✅ Frontend loading chat history (even if empty)
- ✅ No error messages in console
- ✅ Health endpoint showing `"ok": true`

