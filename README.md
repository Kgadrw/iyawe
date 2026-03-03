# Iyawe - Document Recovery Platform

A secure platform that connects people who lose important documents (IDs, passports, ATM cards, student cards) with those who find them. The platform acts as a safe intermediary system, matching lost and found reports, verifying ownership securely, and guiding users to safe handover points.

## Features

- 🔒 **Secure Document Reporting**: Report lost or found documents without exposing sensitive information
- 🔍 **Smart Matching**: Automatic matching algorithm connects lost and found reports
- ✅ **Ownership Verification**: Secure verification system to confirm document ownership
- 🏢 **Institution Network**: Integration with banks, universities, police stations, and sector offices
- 📱 **User-Friendly Dashboard**: Easy-to-use interface for managing reports
- 🆓 **Free for Users**: No cost to recover documents - institutions subscribe to the platform

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB (via Prisma)
- **Authentication**: JWT-based authentication
- **UI**: Tailwind CSS + Radix UI components
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Iyawe
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
DATABASE_URL="database connection"
JWT_SECRET="your-secret-key-change-in-production"
```

4. Set up the database:
```bash
npm run db:generate
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── reports/       # Document reporting endpoints
│   │   └── matches/      # Matching and verification endpoints
│   ├── dashboard/         # User dashboard
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   └── report/            # Report pages (lost/found)
├── components/            # React components
│   └── ui/               # Reusable UI components
├── lib/                   # Utility functions
│   ├── auth.ts           # Authentication helpers
│   ├── matching.ts       # Matching algorithm
│   ├── verification.ts   # Verification system
│   └── prisma.ts         # Prisma client
└── prisma/               # Database schema
    └── schema.prisma     # Prisma schema
```

## Key Features Explained

### Document Reporting
- Users can report lost documents with basic details (type, number, location, date)
- Users can report found documents without exposing sensitive information
- All document numbers are hashed for security

### Matching Algorithm
- Automatically matches lost and found reports based on:
  - Document type
  - Document number (full or partial match)
  - Location proximity
  - Date proximity
- Confidence scoring (0-1) determines match quality

### Verification System
- Secure verification codes generated for each match
- Ownership verification requires document number confirmation
- Prevents fraud and ensures legitimate handovers

### Institution Integration
- Institutions (banks, universities, police stations) can subscribe
- Manage handovers at their locations
- Track document recovery statistics

## Database Schema

The platform uses Prisma with MongoDB:

- **User**: User accounts (regular users and institutions)
- **LostReport**: Reports of lost documents
- **FoundReport**: Reports of found documents
- **Match**: Matches between lost and found reports
- **Verification**: Ownership verification records
- **Handover**: Document handover records at institutions
- **Institution**: Institution accounts and details

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Reports
- `POST /api/reports/lost` - Create lost document report
- `GET /api/reports/lost` - Get user's lost reports
- `POST /api/reports/found` - Create found document report
- `GET /api/reports/found` - Get user's found reports

### Matching & Verification
- `POST /api/matches/[matchId]/verify` - Create verification for a match
- `POST /api/verify` - Verify ownership with code

## Security Features

- Password hashing with bcrypt
- JWT-based authentication with HTTP-only cookies
- Document number hashing for secure storage
- Partial document number display for privacy
- Secure verification codes

## Future Enhancements

- [ ] Email notifications for matches
- [ ] SMS notifications
- [ ] Institution dashboard
- [ ] Handover scheduling system
- [ ] Mobile app
- [ ] Multi-language support
- [ ] Advanced search and filters
- [ ] Document photo upload (with privacy protection)
- [ ] Analytics dashboard for institutions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Support

For support, email support@iyawe.com or create an issue in the repository.

