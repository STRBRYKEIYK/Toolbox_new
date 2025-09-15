# TOOLBOX - Desktop Shopping Application

A professional point-of-sale (POS) system built with Next.js, designed for retail environments with dynamic API integration and real-time inventory management.

## 🚀 Features

### Core Functionality
- **Animated Start Screen** - Professional splash page with API configuration
- **Dynamic API Integration** - Configurable endpoints that change daily
- **Real-time Inventory Management** - Live product data fetching and updates
- **Shopping Cart System** - Add, modify, and manage items with quantity controls
- **Barcode Scanner Integration** - Quick item lookup and addition
- **User-based Checkout** - Employee ID verification and transaction logging
- **API Commit System** - Automatic inventory updates upon checkout

### Technical Features
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Dark/Light Mode** - Automatic theme switching
- **Real-time Data Sync** - Live API connection monitoring
- **Graceful Fallbacks** - Mock data when API is unavailable
- **Professional UI** - Modern design with smooth animations
- **TypeScript** - Full type safety and IntelliSense support

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **State Management**: React Hooks
- **API Integration**: Fetch API with custom service layer
- **Build Tool**: Turbopack
- **Package Manager**: npm/yarn/pnpm

## 📋 Prerequisites

- Node.js 18.0 or higher
- npm, yarn, or pnpm
- API server running on your network (configurable)

## 🚀 Quick Start

### 1. Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd toolbox-shopping-app

# Install dependencies
npm install
# or
yarn install
# or
pnpm install
\`\`\`

### 2. Development

\`\`\`bash
# Start the development server
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. API Configuration

1. **Start the Application**: The app will show the animated start screen
2. **Configure API**: Click "Settings" to enter your API base URL
3. **Test Connection**: The app will automatically test the connection
4. **Start Ordering**: Once connected, click "Start Ordering" to access the main app

## 🔧 API Configuration

### Required API Endpoints

Your API server must provide these endpoints:

#### 1. Health Check (Optional but Recommended)
\`\`\`
GET /health
Response: 200 OK
\`\`\`

#### 2. Items Endpoint (Required)
\`\`\`
GET /api/items
Response: Array of item objects
\`\`\`

**Expected Item Structure:**
\`\`\`json
{
  "id": "string",
  "name": "string",
  "brand": "string", 
  "itemType": "string",
  "location": "string",
  "balance": number,
  "status": "in-stock" | "low-stock" | "out-of-stock"
}
\`\`\`

#### 3. Items Update Endpoint (Required for Checkout)
\`\`\`
PUT /api/items
Body: Array of updated item objects
Response: 200 OK on success
\`\`\`

#### 4. Employees Endpoint (Future Use)
\`\`\`
GET /api/employees
Response: Array of employee objects
\`\`\`

### API Configuration Examples

**Development Server:**
\`\`\`
http://localhost:3001
\`\`\`

**Network Server:**
\`\`\`
http://192.168.1.100:3001
http://10.0.0.50:3001
\`\`\`

**Production Server:**
\`\`\`
https://api.yourcompany.com
\`\`\`

## 📱 Usage Guide

### Getting Started

1. **Launch Application**: Open the app in your browser
2. **Configure API**: Enter your API server URL in settings
3. **Verify Connection**: Ensure the connection indicator shows "Connected"
4. **Start Shopping**: Click "Start Ordering" to access the main interface

### Main Interface

#### Dashboard View
- **Product Grid/List**: Toggle between grid and list views
- **Search & Filter**: Find products by name, brand, or category
- **Category Filter**: Filter by product categories
- **Status Filter**: Show/hide available/unavailable items
- **Barcode Scanner**: Quick item lookup and addition
- **Sorting Options**: Sort by name or stock levels

#### Shopping Cart
- **Add Items**: Click "Add" on any product or use barcode scanner
- **Modify Quantities**: Use +/- buttons to adjust quantities
- **Remove Items**: Individual or bulk removal options
- **Real-time Totals**: Live calculation of items and totals

#### Checkout Process
1. **Review Cart**: Verify all items and quantities
2. **Enter User ID**: Manual entry or barcode scan
3. **Confirm Transaction**: Process checkout and update inventory
4. **API Commit**: Automatic inventory updates (if connected)

### Advanced Features

#### API Data Management
- **Auto-refresh**: Manual refresh button for latest data
- **Connection Monitoring**: Real-time API status indicator
- **Fallback Mode**: Automatic switch to demo data if API fails
- **Data Source Indicator**: Shows whether using live or mock data

#### Inventory Updates
- **Real-time Balance**: Live inventory tracking
- **Automatic Status Updates**: Stock status changes based on quantities
- **Transaction Logging**: Complete audit trail of all transactions

## 🖥️ Deployment Options

### 1. Desktop Application (Electron)

\`\`\`bash
# Install Electron
npm install -g electron

# Build the app
npm run build

# Package as desktop app
npx electron-builder
\`\`\`

### 2. Web Application (Vercel/Netlify)

\`\`\`bash
# Build for production
npm run build

# Deploy to Vercel
npx vercel

# Or deploy to Netlify
npm run build && netlify deploy --prod --dir=out
\`\`\`

### 3. Self-Hosted Server

\`\`\`bash
# Build the application
npm run build

# Start production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start npm --name "toolbox-app" -- start
\`\`\`

### 4. Docker Deployment

\`\`\`dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

\`\`\`bash
# Build and run Docker container
docker build -t toolbox-app .
docker run -p 3000:3000 toolbox-app
\`\`\`

### 5. Mobile App (Capacitor)

\`\`\`bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init

# Add platforms
npx cap add ios
npx cap add android

# Build and sync
npm run build
npx cap sync

# Open in native IDEs
npx cap open ios
npx cap open android
\`\`\`

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

\`\`\`env
# API Configuration
NEXT_PUBLIC_DEFAULT_API_URL=http://localhost:3001
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000

# App Configuration
NEXT_PUBLIC_APP_NAME=TOOLBOX
NEXT_PUBLIC_APP_VERSION=1.0.0

# Feature Flags
NEXT_PUBLIC_ENABLE_BARCODE_SCANNER=true
NEXT_PUBLIC_ENABLE_DARK_MODE=true
\`\`\`

### Customization

#### Branding
- Update `components/start-page.tsx` for logo and branding
- Modify `app/globals.css` for color scheme
- Change app name in `app/layout.tsx`

#### API Integration
- Modify `lib/api-config.ts` for custom API endpoints
- Update data transformation in `components/dashboard-view.tsx`
- Customize checkout logic in `components/cart-view.tsx`

## 🐛 Troubleshooting

### Common Issues

#### API Connection Problems
\`\`\`
Error: API not connected
Solution: 
1. Verify API server is running
2. Check network connectivity
3. Confirm API URL is correct
4. Test endpoints manually with curl/Postman
\`\`\`

#### Data Loading Issues
\`\`\`
Error: No items found
Solution:
1. Check API response format
2. Verify data transformation logic
3. Review browser console for errors
4. Test with mock data first
\`\`\`

#### Checkout Failures
\`\`\`
Error: Checkout failed
Solution:
1. Ensure API accepts PUT requests
2. Verify request payload format
3. Check CORS settings on API server
4. Review network logs
\`\`\`

### Debug Mode

Enable debug logging by adding to console:
\`\`\`javascript
localStorage.setItem('debug', 'true')
\`\`\`

### Performance Optimization

#### Large Datasets
- Implement pagination for 1000+ items
- Use virtual scrolling for better performance
- Add search debouncing
- Optimize API response caching

#### Network Issues
- Implement retry logic for failed requests
- Add offline mode support
- Cache frequently accessed data
- Use service workers for background sync

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards

- Use TypeScript for all new code
- Follow ESLint configuration
- Write unit tests for new features
- Update documentation for API changes
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

1. **Documentation**: Check this README first
2. **Issues**: Create a GitHub issue for bugs
3. **Discussions**: Use GitHub Discussions for questions
4. **Email**: Contact support@yourcompany.com

### Reporting Bugs

When reporting bugs, please include:
- Operating system and version
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Console error messages
- Network logs (if API related)

## 🗺️ Roadmap

### Version 1.1
- [ ] Employee management system
- [ ] Advanced reporting dashboard
- [ ] Inventory alerts and notifications
- [ ] Multi-location support

### Version 1.2
- [ ] Offline mode support
- [ ] Advanced barcode scanner features
- [ ] Receipt printing integration
- [ ] Customer management system

### Version 2.0
- [ ] Multi-tenant architecture
- [ ] Advanced analytics
- [ ] Mobile app (iOS/Android)
- [ ] Integration with popular POS systems

---

**Built with ❤️ using Next.js and TypeScript**

For more information, visit our [documentation site](https://docs.yourcompany.com) or contact our support team.
