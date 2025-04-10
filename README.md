# Comemingel - Social Proximity Platform

Comemingel is a modern social proximity platform designed to connect people in meaningful ways through location-based interactions and shared interests. This application enables users to discover nearby activities, meet new people, and engage with their community in a privacy-conscious manner.

![Comemingel Platform](./generated-icon.png)

## 🌟 Core Features

- **Proximity-based Discovery**: Find and connect with people and activities near you in real-time.
- **Privacy-focused Design**: User information is only revealed within proximity boundaries you control.
- **Activity Creation & Participation**: Create, join, and manage local activities with ease.
- **Trust & Reputation System**: Build trust through participation, verification, and positive interactions.
- **Secure Messaging**: End-to-end encrypted chat for private communications.
- **Bluetooth-enabled Interactions**: Enhanced connection capabilities when in close proximity.
- **Challenges & Gamification**: Engage with your surroundings through fun, interactive challenges.
- **Personalized Recommendations**: AI-powered activity and connection suggestions.

## 🏗️ System Architecture

Comemingel is built using a full-stack JavaScript/TypeScript architecture:

### Frontend

- **React + TypeScript**: Core frontend framework with type safety
- **Vite**: Fast bundling and development server
- **TanStack Query**: Data fetching and state management
- **Tailwind CSS**: Utility-first styling with shadcn/ui components
- **Mapbox GL**: Interactive maps and geolocation features

### Backend

- **Express.js**: RESTful API server
- **PostgreSQL + Drizzle ORM**: Relational database with type-safe ORM
- **Firebase**: Authentication and real-time services
- **OpenAI Integration**: Intelligent search and recommendations
- **WebSockets**: Real-time communication

## 📂 Project Structure

```
comemingel/
├── client/                  # Frontend React application
│   ├── public/              # Static assets
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── contexts/        # React context providers
│       ├── hooks/           # Custom React hooks
│       ├── lib/             # Utility functions and configurations
│       ├── pages/           # Application pages
│       └── types/           # TypeScript type definitions
├── server/                  # Backend Express server
│   ├── routes/              # API route handlers
│   ├── utils/               # Server utility functions
│   ├── index.ts             # Server entry point
│   └── storage.ts           # Data storage interface
├── shared/                  # Shared code between client and server
│   └── schema.ts            # Database schema and types
└── dataconnect/             # Firebase connection modules
```

## 🔧 Key Components

### Authentication System

The authentication system supports both development and production modes:

- **Firebase Authentication**: In production mode, user authentication is handled through Firebase, providing secure login and session management.
- **Development Mode**: For easier development, the system includes a mock authentication mode that can be toggled on/off.
- **Session Persistence**: User sessions are maintained across visits with secure token storage.

### Reputation System

The trust and reputation system consists of multiple components:

- **Overall Score**: Composite score reflecting user reliability and trustworthiness.
- **Category Scores**: Specialized ratings for reliability, safety, and community participation.
- **Verification Levels**: Progressive trust tiers from basic to ambassador status.
- **Trust Badges**: Visual indicators of achievements and user status.
- **Event History**: Transparent record of reputation-affecting events.

### Location & Proximity Features

- **Real-time Location Sharing**: Optional sharing of user location while using the app.
- **Proximity Filters**: Customizable distance settings for discovering people and activities.
- **Bluetooth Integration**: Enhanced peer discovery when devices are in close proximity.
- **Privacy Controls**: Granular settings to control location visibility.

### Activity Management

- **Activity Creation**: Interface for creating and scheduling local activities.
- **Participation**: Tools for joining, following, and engaging with activities.
- **Recommendations**: AI-powered suggestions based on user preferences and behavior.
- **Categories**: Organized activity types including sports, social, food & drinks, etc.

### Chat & Communication

- **Encrypted Messaging**: End-to-end encrypted communications.
- **Message Status Tracking**: Delivery and read receipts for messages.
- **Media Sharing**: Support for images, videos, and audio in chats.
- **Bluetooth Chat Mode**: Direct device-to-device communication when in proximity.

## ⚙️ Configuration Options

Comemingel offers several configuration options that can be customized:

### Environment Variables

The application requires the following environment variables in a `.env` file:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string in the format: `postgresql://username:password@hostname:port/database` | Yes |
| `VITE_FIREBASE_API_KEY` | Firebase API key for authentication (from Firebase console > Project settings > Web app) | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project identifier | Yes |
| `VITE_FIREBASE_APP_ID` | Firebase application ID | Yes |
| `VITE_MAPBOX_TOKEN` | Mapbox access token for maps (from mapbox.com) | Yes |
| `OPENAI_API_KEY` | OpenAI API key for intelligent features | Optional |
| `SESSION_SECRET` | Secret string for session encryption | Yes |

See the `.env.example` file in the repository for a template with additional optional settings.

### Firebase Configuration

For Firebase authentication to work properly:

1. Create a project in the [Firebase console](https://console.firebase.google.com/)
2. Enable the Authentication service and set up the Google sign-in method
3. Add your application domain to the authorized domains list
4. Copy the configuration details from Project settings > Your apps > Web app

### Mapbox Configuration

For location features to work:

1. Create an account at [Mapbox](https://www.mapbox.com/)
2. Generate an access token with the necessary scopes
3. Add the token to your environment variables

### Development Mode Settings

In development mode, you can:

- **Toggle Authentication**: Switch between mock and real authentication using the button in the bottom-right corner
- **Mock Data**: Development mode automatically provides realistic test data for all features
- **Authentication Persistence**: Control authentication persistence by modifying the `FIREBASE_AUTH_PERSISTENCE` constant in `client/src/lib/constants.ts`
- **Local Storage Settings**: 
  - `localStorage.setItem('useRealAuth', 'true')` - Force real Firebase authentication
  - `localStorage.setItem('devUser', JSON.stringify({...}))` - Customize the mock user

### Feature Flags

Customize your experience with these feature toggles:

- **Location Sharing**: Enable/disable in profile settings
- **Notifications**: Control notification preferences
- **Privacy Settings**: Configure data visibility and sharing options
- **Interface Language**: Currently supports Norwegian with English planned

## 📅 Change Log

### Major Releases

#### v0.5.0 (Current Development)
- Enhanced user profile system with reputation display and activity history
- Improved authentication system with development/production mode support
- Added Norwegian language support throughout the interface
- Implemented Bluetooth-based proximity detection

#### v0.4.0
- Added activity creation and management
- Implemented social recommendation engine
- Introduced challenge system with gamification elements

#### v0.3.0
- Integrated secure messaging system with end-to-end encryption
- Added friend management features
- Implemented user search and discovery

#### v0.2.0
- Location-based user and activity discovery
- Interactive map interface with privacy controls
- Basic profile system

#### v0.1.0
- Initial application framework
- Firebase authentication integration
- Basic UI components

### Recent Changes

- **Enhanced Profile System**: Added complete user profile with reputation metrics, activity history, and verification badges
- **Auth System Improvements**: Added support for toggling between mock and real authentication in development
- **Trust & Reputation**: Implemented comprehensive reputation tracking with visual indicators
- **Norwegian UI**: Completed Norwegian language implementation across the platform
- **Offline Support**: Added robust offline capabilities with visual indicators and local caching

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Firebase project
- Mapbox account
- OpenAI API key (optional for enhanced features)

### Installation

1. Clone the repository or set up the Replit project:
   ```
   git clone https://github.com/comemingel/app.git
   cd app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the required environment variables (see below for an example).

4. Initialize the database:
   ```
   npm run db:push
   ```

5. Start the development server:
   ```
   npm run dev
   ```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database
DATABASE_URL=postgresql://username:password@hostname:port/database

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_APP_ID=your-firebase-app-id

# Mapbox Configuration
VITE_MAPBOX_TOKEN=your-mapbox-token

# OpenAI Configuration (optional for enhanced features)
OPENAI_API_KEY=your-openai-api-key

# Session Secret (for auth)
SESSION_SECRET=a-secure-random-string
```

### Deployment

The application can be deployed to any platform supporting Node.js applications:

1. Build the production version:
   ```
   npm run build
   ```

2. Start the production server:
   ```
   npm start
   ```

### Development Mode

When running in development mode, you can:

1. Use the toggle button in the bottom-right corner to switch between mock and real authentication
2. Access development-only features by setting `localStorage.setItem('useRealAuth', 'true')` in your browser console

## 🧪 Testing External Services

Comemingel includes test scripts to validate your connection to external services. These scripts help verify that your API keys and configuration are set up correctly. Alle tester kobler direkte til de faktiske tjenestene (ingen mock-servere eller simulerte responser brukes) for å verifisere at applikasjonen har korrekt tilgang.

### CLI Commands for Running Tests

Below are the exact commands to run each test from the command line, their expected output, and what to look for to confirm success.

#### Interactive Test Menu

Run the interactive test menu to select which tests to run:

```bash
node scripts/run-tests.mjs
```

Expected output:
```
=== External Services Test Menu ===

Select a test to run:

1. Test Database Connection
2. Test Firebase Configuration
3. Test Mapbox API
4. Test OpenAI API
a. Run all tests
q. Quit

Enter your choice: 
```

#### Database Connection Test

```bash
npx tsx scripts/tests/database-test.ts
```

Expected successful output:
```
=== Testing PostgreSQL Database Connection ===
Loading environment variables from /path/to/.env
Creating connection pool...
Initializing Drizzle ORM...
Testing basic query...
Database server time: 2025-04-10 12:34:56.789Z

Verifying database schema...
Found 15 tables in Drizzle schema
Found 15 tables in database
✓ All schema tables exist in the database

Closing database connection...
✓ Database connection test completed successfully!
```

What to look for:
- Confirmation that the database connection is established
- The current database server time is displayed
- Tables defined in the schema are found in the database
- Final success message

#### Firebase Configuration Test

```bash
npx tsx scripts/tests/firebase-test.ts
```

Expected successful output:
```
=== Testing Firebase Configuration ===
Loading environment variables from /path/to/.env
Initializing Firebase app...
✓ Firebase app initialized successfully

Initializing Firebase Auth...
✓ Firebase Auth initialized successfully

✓ Firebase configuration test completed successfully!
Note: This only verifies configuration, not actual authentication.
To test authentication, you would need to attempt a sign-in operation.
```

What to look for:
- Firebase app initializes successfully
- Firebase Auth initializes successfully
- Final success message confirming the configuration works

#### Mapbox API Test

```bash
npx tsx scripts/tests/mapbox-test.ts
```

Expected successful output:
```
=== Testing Mapbox API Token ===
Loading environment variables from /path/to/.env
Mapbox token found (length: 70)
Testing Mapbox token with API request...
✓ Mapbox API request successful
Geocoded "Oslo, Norway" to coordinates: [10.7522, 59.9139]

✓ Mapbox API token test completed successfully!
```

What to look for:
- Mapbox token is detected
- API request succeeds
- Coordinates for "Oslo, Norway" are returned
- Final success message confirming the token works

#### OpenAI API Test

```bash
npx tsx scripts/tests/openai-test.ts
```

Expected successful output:
```
=== Testing OpenAI API Connection ===
Loading environment variables from /path/to/.env
OpenAI API key found
Initializing OpenAI client...
Testing API with a simple request...
✓ OpenAI API request successful
Response preview:
This is a confirmation that your OpenAI API connection is working properly. Your test has been successful...

API Usage:
- Prompt tokens: 24
- Completion tokens: 31
- Total tokens: 55

✓ OpenAI API test completed successfully!
```

What to look for:
- OpenAI API key is detected
- API request succeeds
- A response is generated from the model
- Token usage information is displayed
- Final success message confirming the API key works

### Running All Tests Sequentially

To run all tests one after another from the command line:

```bash
for test in database firebase mapbox openai; do
  echo "Running $test test..."
  npx tsx scripts/tests/$test-test.ts
  echo "------------------------"
  echo ""
done
```

### Test Failure Examples and Troubleshooting

#### Database Connection Failure

```
=== Testing PostgreSQL Database Connection ===
ERROR: DATABASE_URL environment variable is not set
```

Fix: Ensure the DATABASE_URL environment variable is set in your .env file.

```
=== Testing PostgreSQL Database Connection ===
ERROR: Failed to connect to the database
error: connection to server at "your-host" (123.456.789.10), port 5432 failed: FATAL: password authentication failed for user "postgres"
```

Fix: Check that your database credentials in DATABASE_URL are correct.

#### Firebase Configuration Failure

```
=== Testing Firebase Configuration ===
ERROR: Missing required Firebase environment variables:
  - VITE_FIREBASE_API_KEY
  - VITE_FIREBASE_PROJECT_ID
```

Fix: Add the missing Firebase configuration variables to your .env file.

```
=== Testing Firebase Configuration ===
ERROR: Failed to initialize Firebase
FirebaseError: API key not valid. Please pass a valid API key.
```

Fix: Update your Firebase API key with a valid one from the Firebase console.

#### Mapbox API Failure

```
=== Testing Mapbox API Token ===
ERROR: VITE_MAPBOX_TOKEN environment variable is not set
```

Fix: Add your Mapbox token to the VITE_MAPBOX_TOKEN variable in your .env file.

```
=== Testing Mapbox API Token ===
ERROR: Mapbox API request failed with status 401
Error message: Unauthorized: Invalid token
```

Fix: Update your Mapbox token with a valid one from your Mapbox account.

#### OpenAI API Failure

```
=== Testing OpenAI API Connection ===
ERROR: OPENAI_API_KEY environment variable is not set
```

Fix: Add your OpenAI API key to the OPENAI_API_KEY variable in your .env file.

```
=== Testing OpenAI API Connection ===
ERROR: Failed to connect to OpenAI API
Status: 401
Message: Incorrect API key provided
```

Fix: Update your OpenAI API key with a valid one from your OpenAI account.

```
=== Testing OpenAI API Connection ===
ERROR: Failed to connect to OpenAI API
Status: 429
Message: You exceeded your current quota, please check your plan and billing details.
```

Fix: Your API key is valid but has exceeded its usage quota. Either:
- Add funds to your OpenAI account
- Use a different API key with available quota
- Contact OpenAI support to increase your quota

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is proprietary and confidential. Unauthorized copying, modification, distribution, or use is strictly prohibited.

## 🙏 Acknowledgments

- Thanks to all contributors and team members
- Built with the support of the Norwegian developer community