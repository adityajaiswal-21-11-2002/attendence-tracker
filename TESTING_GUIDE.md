# Comprehensive Testing Guide

This document describes the comprehensive testing suite for the Attendance Tracker application.

## Overview

The application includes multiple test suites to ensure reliability, security, and data integrity:

1. **Basic Backend Tests** (`test:backend`) - Basic API endpoint tests
2. **Complex Backend Tests** (`test:complex`) - Edge cases and validation tests
3. **Comprehensive Tests** (`test:comprehensive`) - Deep testing of all features
4. **Database Integrity Tests** (`test:database`) - Data consistency and referential integrity

## Running Tests

### Prerequisites

1. Ensure the development server is running:
   ```bash
   npm run dev
   ```

2. Ensure MongoDB is connected and accessible

3. (Optional) Generate dummy test data:
   ```bash
   npm run generate:dummy-data
   ```

### Test Commands

```bash
# Run basic backend tests
npm run test:backend

# Run complex backend tests
npm run test:complex

# Run comprehensive deep tests
npm run test:comprehensive

# Run database integrity tests
npm run test:database

# Run all tests
npm run test:deep
```

## Test Suites

### 1. Comprehensive Test Suite (`test-comprehensive.ts`)

This is the main deep testing suite that covers:

#### Authentication Tests
- Valid/invalid login credentials
- User registration with validation
- Duplicate email handling
- Password strength validation
- Empty credentials handling

#### Authorization Tests
- Role-based access control
- Admin endpoint access
- Employee permission restrictions
- Unauthenticated access prevention

#### Attendance Tests
- Mark login/logout
- Get attendance logs
- Date range validation
- Live status checks
- Invalid date handling

#### Leave Management Tests
- Leave balance retrieval
- Leave application
- Date range validation
- Leave type validation
- Leave history

#### Roster Tests
- Employee roster retrieval
- Calendar view
- Roster assignment
- Date validation

#### Salary Tests
- Employee salary view
- Payslip retrieval
- Salary calculation
- Invalid month/year handling

#### Security Tests
- SQL injection attempts
- XSS attack prevention
- NoSQL injection attempts
- Rate limiting
- Path traversal prevention

#### Data Validation Tests
- Email format validation
- Negative salary prevention
- Invalid shift time format
- ObjectId validation
- Required field validation

#### Business Logic Tests
- Leave balance calculations
- Attendance hours validation
- Insufficient leave balance handling

#### Edge Cases
- Very long date ranges
- Empty request bodies
- Extremely large numbers
- Special characters
- Unicode characters

#### Integration Tests
- Complete attendance workflow
- Complete leave application workflow

### 2. Database Integrity Tests (`test-database-integrity.ts`)

Tests database consistency and referential integrity:

#### Referential Integrity
- User-Company relationships
- Attendance-User relationships
- Leave-User relationships
- Manager-Employee relationships
- Task assignments
- Roster assignments

#### Data Consistency
- No duplicate attendance records
- CompanyId matching
- Valid salary amounts
- Valid attendance hours (0-24)
- Valid leave date ranges
- Unique email addresses
- Valid shift time formats

#### Index Verification
- User email index
- Attendance unique index

#### Data Completeness
- Required user fields
- Required attendance fields

## Test Results

Test results are saved as JSON files:

- `test-results.json` - Basic backend tests
- `test-results-complex.json` - Complex backend tests
- `test-results-comprehensive.json` - Comprehensive tests
- `test-results-database-integrity.json` - Database integrity tests

Each report includes:
- Test summary (total, passed, failed, pass rate)
- Results by category
- Failed test details
- Performance metrics
- Timestamp

## Understanding Test Results

### Pass/Fail Criteria

Tests are designed to validate:
1. **Correct behavior** - Expected functionality works
2. **Error handling** - Invalid inputs are rejected appropriately
3. **Security** - Vulnerabilities are prevented
4. **Data integrity** - Database constraints are maintained

### Common Test Scenarios

1. **401 Unauthorized** - Expected for unauthenticated requests
2. **400 Bad Request** - Expected for invalid input
3. **200 OK** - Expected for valid authenticated requests
4. **429 Too Many Requests** - Expected when rate limiting is active

### Handling Test Failures

If tests fail:

1. **Check server status** - Ensure the dev server is running
2. **Check database connection** - Verify MongoDB is accessible
3. **Check test data** - Run `generate:dummy-data` if needed
4. **Review error messages** - Check the detailed error in test results
5. **Check environment variables** - Ensure `.env.local` is configured

## Test Coverage

The comprehensive test suite covers:

- ✅ Authentication & Authorization
- ✅ All API endpoints
- ✅ Data validation
- ✅ Security vulnerabilities
- ✅ Business logic
- ✅ Edge cases
- ✅ Integration workflows
- ✅ Database integrity
- ✅ Error handling
- ✅ Rate limiting

## Continuous Testing

For development workflow:

1. Run tests before committing:
   ```bash
   npm run test:deep
   ```

2. Run specific test suite during development:
   ```bash
   npm run test:comprehensive
   ```

3. Check database integrity after data changes:
   ```bash
   npm run test:database
   ```

## Notes

- Some tests require authenticated sessions - these will gracefully handle authentication failures
- Tests are designed to work with or without full authentication setup
- Database integrity tests require direct database access
- Rate limiting tests may pass or fail depending on configuration
- Some edge case tests are designed to verify graceful error handling

## Troubleshooting

### Tests fail with connection errors
- Ensure the server is running on the correct port
- Check `NEXTAUTH_URL` in `.env.local`

### Authentication tests fail
- **Note**: NextAuth authentication from Node.js scripts can be complex due to cookie and session handling requirements
- Verify test users exist (run `generate:dummy-data`)
- Check password is `Test@123` for test users
- If authentication consistently fails, the test suite will still run other tests (validation, security, edge cases)
- Authentication tests verify the authentication flow, but may require browser-based authentication for full functionality
- Tests that require authenticated sessions will be skipped if authentication fails (you'll see warnings in the output)

### Database tests fail
- Ensure MongoDB connection string is correct
- Check database permissions
- Verify test data exists

## Contributing

When adding new features:

1. Add corresponding tests to the appropriate test suite
2. Update this guide if adding new test categories
3. Ensure all tests pass before submitting PR

