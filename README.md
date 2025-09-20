
# 🏠 GarageGrid Pro

**Professional Garage Inventory Management System**

A comprehensive Next.js application for organizing, tracking, and managing garage inventory with advanced search capabilities and analytics dashboard.

![GarageGrid Pro](./app/public/app-icon.png)

## ✨ Features

### 🎯 Core Functionality
- **Room-Based Organization** - Organize items by garage rooms/areas
- **Item Inventory Management** - Full CRUD operations for items
- **Image Upload & Gallery** - Photo management for items
- **Advanced Search & Filtering** - Multi-field search with sorting
- **Analytics Dashboard** - Statistics and insights
- **User Authentication** - Secure login/signup system

### 🎨 User Experience
- **Professional Branding** - Custom logo and consistent styling
- **Responsive Design** - Mobile and desktop optimized
- **Intuitive Navigation** - Room-based organization
- **Real-time Search** - Quick item location
- **Visual Analytics** - Interactive charts and graphs

## 🚀 Technology Stack

- **Framework:** Next.js 14.2.28
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Language:** TypeScript
- **Package Manager:** Yarn

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Yarn package manager

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/garagegrid-pro.git
   cd garagegrid-pro
   ```

2. **Install dependencies**
   ```bash
   cd app
   yarn install
   ```

3. **Environment setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Update .env with your database and auth credentials
   ```

4. **Database setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations
   npx prisma db push
   
   # Seed database (optional)
   yarn seed
   ```

5. **Start development server**
   ```bash
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⚙️ Environment Variables

Create a `.env` file in the `app/` directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/garagegrid_pro"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Optional: LLM API (if using AI features)
ABACUSAI_API_KEY="your-api-key"
```

## 🗄️ Database Schema

### Core Models
- **User** - Authentication and user management
- **Room** - Garage rooms/storage areas
- **Item** - Inventory items with metadata

### Key Features
- Foreign key relationships
- Soft deletes support
- Created/updated timestamps
- Optimized queries with Prisma

## 🛠️ Development

### Project Structure
```
garagegrid-pro/
├── app/                    # Next.js app directory
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities and configs
│   ├── public/           # Static assets
│   ├── prisma/           # Database schema
│   └── scripts/          # Database seeds
├── uploads/              # User uploaded files
├── PROJECT_MEMORY.md     # Development documentation
└── README.md            # This file
```

### Available Scripts
- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn lint` - Run ESLint
- `yarn seed` - Seed database with sample data

### API Endpoints
- `/api/auth/*` - Authentication (NextAuth.js)
- `/api/rooms` - Room management
- `/api/items` - Item management
- `/api/search` - Advanced search
- `/api/analytics` - Statistics
- `/api/upload` - File uploads

## 🔐 Authentication

### Test Credentials
- **Admin:** `admin@test.com` / `admin123`
- **User:** `test@test.com` / `test123`

### Features
- Secure password hashing (bcrypt)
- Session-based authentication
- Protected API routes
- User registration/login

## 📊 Analytics & Search

### Advanced Search
- Multi-field filtering (room, category, condition)
- Sorting options (name, date, value)
- Pagination support
- Real-time results

### Analytics Dashboard
- Inventory statistics
- Room distribution charts
- Category breakdowns
- Value calculations
- Visual data representation

## 🚀 Deployment

### Production Build
```bash
cd app
yarn build
yarn start
```

### Environment Setup
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Build and deploy

### Recommended Platforms
- **Vercel** (recommended for Next.js)
- **Railway** (with PostgreSQL)
- **DigitalOcean App Platform**
- **AWS/GCP/Azure**

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@garagegrid.com or open an issue on GitHub.

## 🗺️ Roadmap

- [ ] **Mobile App** - React Native companion
- [ ] **Barcode Scanning** - QR/barcode item identification
- [ ] **Export Features** - PDF reports and data export
- [ ] **Team Collaboration** - Multi-user access controls
- [ ] **Real-time Updates** - WebSocket integration
- [ ] **Advanced Analytics** - Predictive insights

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database management with [Prisma](https://www.prisma.io/)
- Charts powered by [Recharts](https://recharts.org/)

---

**GarageGrid Pro** - *Smart Storage. Effortless Retrieval.*
