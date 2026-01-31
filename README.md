# 🚀 AI-Powered Smart Daily Planner

<div align="center">

![Smart Planner Banner](https://img.shields.io/badge/Powered%20by-Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

**Transform your productivity with AI-powered scheduling that adapts to YOU**

[Live Demo](#demo) • [Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [API Docs](#-api-documentation)

</div>

---

## 🎯 What is Smart Daily Planner?

Smart Daily Planner is an **AI-powered productivity tool** that uses **Google Gemini** to intelligently schedule your tasks, provide personalized wellness tips, and help you achieve your goals. Unlike traditional planners, it learns from your tasks and creates optimal schedules based on priority, deadlines, and your preferred times.

### 🏆 Built for MLH Hackathon

This project showcases the power of AI in everyday productivity, featuring:
- **Real-time AI scheduling** powered by Gemini 2.0 Flash
- **Smart priority detection** using natural language processing
- **Personalized wellness tips** based on your actual tasks
- **Interactive 3D backgrounds** with Three.js

---

## ✨ Features

### 🤖 AI-Powered Features (Gemini Integration)

| Feature | Description |
|---------|-------------|
| **🧠 Smart Scheduling** | Gemini analyzes your tasks and creates an optimized daily schedule |
| **🎯 AI Priority Suggestion** | Automatically suggests task priority based on title and deadline |
| **📋 Task Breakdown** | Break complex tasks into actionable subtasks with AI |
| **🎪 Goal Recommendations** | Get AI-suggested goals based on your selected role |
| **💡 Personalized Wellness Tips** | Receive health tips tailored to your actual tasks |
| **⏰ Preferred Time Scheduling** | Set preferred times and Gemini respects your preferences |

### 🎨 User Experience

| Feature | Description |
|---------|-------------|
| **🌙 Dark Theme** | Beautiful dark mode with purple accents |
| **🌊 3D Animated Background** | Stunning LiquidEther effect using Three.js |
| **📱 Responsive Design** | Works seamlessly on desktop and mobile |
| **🔥 Streak Tracking** | Track your productivity streak over time |
| **📊 Analytics Dashboard** | Visualize your productivity patterns |
| **⚡ Quick Date/Time Selection** | One-click buttons for Today, Tomorrow, Morning, Evening, etc. |

### 🔐 Authentication

| Feature | Description |
|---------|-------------|
| **👤 User Registration/Login** | Secure JWT-based authentication |
| **🎭 Demo Account** | Try the app instantly with pre-loaded data |
| **🏃 Role-Based Goals** | Choose your role (Student, Professional, etc.) for tailored experience |

---

## 🛠 Tech Stack

### Frontend
```
React 18          → UI Framework
Tailwind CSS      → Styling
Framer Motion     → Animations
Recharts          → Data Visualization
Three.js          → 3D Background Effects
Lucide Icons      → Beautiful Icons
shadcn/ui         → UI Components
```

### Backend
```
FastAPI           → Python Web Framework
SQLAlchemy        → ORM
SQLite            → Database
Google Gemini     → AI/ML API
JWT               → Authentication
Pydantic          → Data Validation
```

---

## 📁 Project Structure

```
mlh-hack/
├── backend/
│   ├── main.py              # FastAPI application with all endpoints
│   ├── planner.db           # SQLite database
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables (GEMINI_API_KEY)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.js    # Home page with 3D background
│   │   │   ├── Dashboard.js      # Main dashboard with schedule
│   │   │   ├── TaskInput.js      # Task creation with AI features
│   │   │   ├── GoalSetup.js      # Role selection & AI goals
│   │   │   └── Analytics.js      # Productivity analytics
│   │   ├── components/ui/        # shadcn/ui components
│   │   └── lib/utils.js          # Utility functions
│   ├── public/
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm/yarn**
- **Python** 3.10+
- **Google Gemini API Key** ([Get one free](https://aistudio.google.com/app/apikey))

### Installation

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/smart-daily-planner.git
cd smart-daily-planner
```

#### 2️⃣ Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Run the server
python main.py
```

#### 3️⃣ Frontend Setup
```bash
cd frontend

# Install dependencies
yarn install  # or npm install

# Start development server
yarn start    # or npm start
```

#### 4️⃣ Access the App
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🔐 Demo Account

Try the app instantly without registration:

| Field | Value |
|-------|-------|
| **Email** | `demo@smartplanner.com` |
| **Password** | `demo123` |

The demo account comes pre-loaded with:
- ✅ 21-day productivity streak
- ✅ 7 days of plan history
- ✅ Sample tasks and schedules

---

## 📖 API Documentation

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login and get JWT token |
| `GET` | `/tasks` | List all tasks |
| `POST` | `/tasks` | Create new task |
| `POST` | `/generate-schedule` | Generate AI schedule |
| `GET` | `/schedule` | Get today's schedule |
| `GET` | `/streak/{user_id}` | Get user's streak |

### AI Feature Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ai-suggest-priority` | Get AI priority suggestion |
| `POST` | `/ai-breakdown` | Break task into subtasks |
| `GET` | `/ai-goal-recommendations` | Get AI goal suggestions |
| `POST` | `/chat` | Chat with AI assistant |

### Interactive API Docs
Visit **http://localhost:8000/docs** for the full Swagger documentation.

---

## 🎮 How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   1. Login      │────▶│  2. Set Goals   │────▶│  3. Add Tasks   │
│   or Demo       │     │  (AI Suggests)  │     │  (AI Priority)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  6. Track       │◀────│  5. Follow      │◀────│  4. Gemini      │
│  Your Streak    │     │  Schedule       │     │  Plans Your Day │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 🔮 AI Features Deep Dive

### Smart Scheduling Algorithm
Gemini considers:
- **Task Priority**: High priority tasks scheduled during peak hours
- **Deadlines**: Urgent tasks get priority
- **Preferred Times**: Respects your time preferences (e.g., "Gym at 5pm")
- **Energy Levels**: Cognitive tasks in morning, creative in afternoon
- **Breaks**: Automatically includes wellness breaks

### Example Gemini Prompt
```
Tasks: [Study Math (2hr, High, Due Tomorrow, Preferred: 09:00), 
        Gym (1hr, Medium, Due Today, Preferred: 17:00)]

Gemini Output:
{
  "schedule": [
    {"time": "09:00-11:00", "task": "Study Math", "reason": "High priority, scheduled at preferred time"},
    {"time": "11:00-11:15", "activity": "Short Break", "wellness_tip": "Take a walk to refresh your mind"},
    {"time": "17:00-18:00", "task": "Gym", "reason": "Scheduled at your preferred evening time"}
  ],
  "wellness_tips": ["Stay hydrated during study sessions", "Stretch before gym workout"]
}
```

---

## 🎨 Screenshots

### Landing Page
- Beautiful 3D LiquidEther background
- "How It Works" flow section
- Demo login button

### Dashboard
- AI Smart Suggestion banner
- Today's schedule with wellness tips
- Streak counter
- Task breakdown feature

### Task Input
- AI Priority Suggestion (auto-detects importance)
- Preferred time picker with quick buttons
- Quick date selection (Today, Tomorrow, This Week)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 Environment Variables

### Backend (.env)
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🐛 Troubleshooting

### API Quota Exceeded
If you see `429 Quota Exceeded` errors:
1. Wait 1-2 minutes for quota to reset
2. Get a new API key from a different Google account
3. The app still works with fallback logic (keyword-based priority)

### Database Errors
If you see `500 Internal Server Error`:
1. Delete `planner.db` to reset the database
2. Restart the backend server
3. Demo data will be re-seeded automatically

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini** - For the powerful AI capabilities
- **MLH** - For organizing amazing hackathons
- **shadcn/ui** - For beautiful React components
- **Three.js** - For stunning 3D effects

---

<div align="center">

**Built with ❤️ for MLH Hackathon**

[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)

</div>
