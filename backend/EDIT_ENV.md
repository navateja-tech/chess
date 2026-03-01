# Edit .env File

## Quick Instructions

1. Open `backend\.env` file in a text editor (Notepad, VS Code, etc.)

2. Find this line:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/chess_db
   ```

3. Replace `YOUR_PASSWORD_HERE` with your actual PostgreSQL password
   - This is the password you entered when running the setup script
   - Example: If your password is `mypass123`, it should be:
     ```
     DATABASE_URL=postgresql://postgres:mypass123@localhost:5432/chess_db
     ```

4. Save the file

## Example .env file:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:your_password_here@localhost:5432/chess_db
JWT_SECRET=dev_secret_change_in_production
```

**Important:** 
- Replace `your_password_here` with your actual PostgreSQL password
- Don't use spaces in the password field
- If your password has special characters, you might need to URL-encode them

## After editing, test the connection:

```bash
cd backend
npm install
npm run setup-db
```

You should see: ✅ Database connected successfully!
