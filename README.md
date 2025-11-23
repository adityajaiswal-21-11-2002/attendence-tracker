# Attendance Tracker System

A comprehensive, modern attendance tracking system built with Next.js 14, TypeScript, MongoDB, and NextAuth.js. Designed for organizations to manage employee attendance, leaves, rosters, salaries, and more.

## Features

### Core Features
- **User Authentication**: Secure authentication with NextAuth.js, role-based access control
- **Attendance Tracking**: Real-time attendance tracking with login/logout, breaks, and task time tracking
- **Leave Management**: Complete leave management system with approval workflow and balance tracking
- **Salary Management**: Automated salary calculation and payslip generation
- **Roster Management**: Shift scheduling and task assignment
- **Reports & Analytics**: Comprehensive reports for attendance, leaves, and salary
- **Export/Import**: Export data to Excel/PDF, import employees and rosters
- **Notifications**: Real-time notifications for leave approvals, announcements, and more
- **Multi-Company Support**: Support for multiple companies with subscription management

### User Roles
- **Primary Admin**: Full system access, company management
- **Secondary Admin**: Company-level administration
- **HR Manager**: HR operations, leave management, payslip generation
- **Operations Manager**: Roster management, operations oversight
- **Team Lead**: Team management, task assignment
- **Employee**: Self-service attendance, leave applications

## Getting Started

### Prerequisites
- Node.js 18 or higher
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd attendance-tracker
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
# Copy env.example to .env.local
cp env.example .env.local
# Or on Windows PowerShell:
Copy-Item env.example .env.local
```

4. **Update `.env.local`** with your configuration:
```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Email Server Configuration
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@attendance-tracker.com
```

5. **Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

6. **Seed initial data** (creates default admin user and holidays):
```bash
npm run seed
```

Default admin credentials:
- Email: `admin@attendance-tracker.com`
- Password: `Admin@123`

**⚠️ IMPORTANT: Change the default password after first login!**

7. **Run the development server**:
```bash
npm run dev
```

8. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with initial data
- `npm run backup` - Backup database to JSON files

## Project Structure

```
attendance-tracker/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages by role
│   └── api/               # API routes
├── components/             # React components
│   ├── ui/                # UI components (Shadcn/ui)
│   ├── attendance/        # Attendance components
│   └── reports/           # Report components
├── lib/                   # Utility functions
│   ├── mongodb.ts         # Database connection
│   ├── auth.ts            # Authentication utilities
│   ├── security.ts        # Security utilities
│   ├── rateLimit.ts       # Rate limiting
│   └── pagination.ts      # Pagination utilities
├── models/                # Mongoose schemas
├── types/                 # TypeScript type definitions
├── scripts/               # Utility scripts
│   ├── seed.ts           # Database seeding
│   └── backup.ts         # Database backup
└── hooks/                 # React hooks
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **Validation**: Zod
- **Forms**: React Hook Form
- **Date Handling**: date-fns
- **Export**: jsPDF, xlsx
- **Email**: Nodemailer

## Documentation

- [Complete Checklist](./CHECKLIST.md) - Comprehensive setup, testing, deployment, and maintenance checklist

## Security Features

- Password hashing with bcrypt
- Input sanitization and validation
- Rate limiting on API routes
- CSRF protection
- XSS prevention
- Security headers
- Role-based access control
- MongoDB injection prevention (via Mongoose)

## Performance Optimizations

- MongoDB indexes on frequently queried fields
- Pagination for large datasets
- Code splitting and lazy loading
- Image optimization
- API response caching
- Database connection pooling

## Deployment

See [CHECKLIST.md](./CHECKLIST.md) for detailed deployment instructions and checklists.

### Quick Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## Backup & Recovery

Run backup script to export all data:
```bash
npm run backup
```

Backups are saved in the `backups/` directory.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues, questions, or contributions:
- Check the documentation files
- Review existing issues
- Create a new issue with detailed information

## License

[Add your license here]

## Changelog

### Version 0.1.0
- Initial release
- Core attendance tracking
- Leave management
- Salary calculation
- Multi-role support

