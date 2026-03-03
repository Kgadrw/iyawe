# Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**
   Create a `.env` file in the root directory (or use the existing one):
   ```env
   DATABASE_URL="mongodb+srv://kalisagad05:Kigali20@@cluster0.b53bq.mongodb.net/iyawe?retryWrites=true&w=majority"
   JWT_SECRET="your-secret-key-change-in-production-make-it-long-and-random"
   ```
   
   Note: The MongoDB connection string is already configured. Make sure to update the JWT_SECRET with a strong random value.

3. **Initialize Database**
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Open Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## First Steps

1. **Create an Account**
   - Click "Get Started" or "Create Free Account"
   - Fill in your details and register

2. **Report a Lost Document**
   - Go to Dashboard
   - Click "Report Lost Document"
   - Fill in the document details

3. **Report a Found Document**
   - Go to Dashboard
   - Click "Report Found Document"
   - Fill in what you found

4. **View Matches**
   - Go to Dashboard
   - Click "View Matches"
   - See if any reports match

## Testing the Platform

### Test Scenario 1: Lost and Found Match

1. Create two accounts (or use two browsers)
2. Account A: Report a lost ID card
   - Document Type: ID Card
   - Document Number: ABC123456
   - Location: Downtown Mall
3. Account B: Report a found ID card
   - Document Type: ID Card
   - Document Number: ABC123456
   - Location: Downtown Mall
4. Check matches in both accounts
5. Start verification process
6. Verify ownership with document number

### Test Scenario 2: Partial Match

1. Report lost document with partial number
2. Report found document with similar number
3. System should still create a match with lower confidence

## Database Management

### View Database
```bash
npm run db:studio
```
This opens Prisma Studio where you can view and edit data.

### Reset Database
For MongoDB, you can clear collections using MongoDB Atlas dashboard or run:
```bash
npm run db:push
```
Note: MongoDB doesn't require file deletion like SQLite.

## Production Deployment

1. **Change Database**
   - Update `DATABASE_URL` in `.env` to use PostgreSQL or MySQL
   - Update `provider` in `prisma/schema.prisma` to `postgresql` or `mysql`
   - Run migrations: `npx prisma migrate dev`

2. **Set Secure JWT Secret**
   - Generate a strong random secret
   - Update `JWT_SECRET` in environment variables

3. **Deploy**
   - Deploy to Vercel, Netlify, or your preferred platform
   - Set environment variables in your hosting platform

## Troubleshooting

### Database Issues
- Make sure `DATABASE_URL` is set correctly
- Run `npm run db:generate` if Prisma client is missing
- Check that `prisma/dev.db` file exists

### Authentication Issues
- Clear browser cookies
- Check that `JWT_SECRET` is set
- Verify token in browser DevTools > Application > Cookies

### Build Issues
- Delete `.next` folder and `node_modules`
- Run `npm install` again
- Run `npm run db:generate`

## Next Steps

- Add email notifications
- Implement institution dashboard
- Add handover scheduling
- Create mobile app
- Add analytics

