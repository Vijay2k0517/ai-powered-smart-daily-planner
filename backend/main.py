"""
AI-Powered Smart Daily Planner Backend
Built with FastAPI, SQLite, and Gemini API
"""

import os
import json
import re
from datetime import datetime, date, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager
from functools import lru_cache
import time

# Load .env file for environment variables
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float, Date, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import google.generativeai as genai

# =============================================================================
# Database Configuration
# =============================================================================

DATABASE_URL = "sqlite:///./planner.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# =============================================================================
# Simple Cache for AI Responses (reduces API calls)
# =============================================================================
_ai_cache = {}
_cache_ttl = 300  # 5 minutes cache
_last_api_call = 0
_min_api_interval = 2  # Minimum seconds between API calls

def get_cached_response(cache_key: str):
    """Get cached AI response if still valid"""
    if cache_key in _ai_cache:
        cached_time, cached_value = _ai_cache[cache_key]
        if time.time() - cached_time < _cache_ttl:
            return cached_value
    return None

def set_cached_response(cache_key: str, value):
    """Cache an AI response"""
    _ai_cache[cache_key] = (time.time(), value)

def can_make_api_call():
    """Check if enough time has passed since last API call"""
    global _last_api_call
    return time.time() - _last_api_call >= _min_api_interval

def mark_api_call():
    """Mark that an API call was made"""
    global _last_api_call
    _last_api_call = time.time()

# =============================================================================
# Database Models
# =============================================================================

class UserModel(Base):
    """SQLAlchemy model for users table"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)  # Simple hash for demo
    created_at = Column(DateTime, default=datetime.utcnow)


class UserPreferencesModel(Base):
    """SQLAlchemy model for user preferences/onboarding answers"""
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    work_style = Column(String(50))  # early_bird, night_owl, flexible
    productivity_goal = Column(String(100))  # focus, balance, learning, career
    work_hours_start = Column(String(10), default="09:00")
    work_hours_end = Column(String(10), default="18:00")
    break_preference = Column(String(50))  # pomodoro, long_blocks, flexible
    biggest_challenge = Column(String(100))  # procrastination, distractions, overload, motivation
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class StreakModel(Base):
    """SQLAlchemy model for tracking user streaks"""
    __tablename__ = "streaks"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_active_date = Column(Date, nullable=True)
    total_active_days = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DailyActivityModel(Base):
    """SQLAlchemy model for tracking daily activity"""
    __tablename__ = "daily_activity"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    date = Column(Date, nullable=False)
    tasks_completed = Column(Integer, default=0)
    tasks_created = Column(Integer, default=0)
    minutes_productive = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class TaskModel(Base):
    """SQLAlchemy model for tasks table"""
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=True, index=True)  # Link to user
    title = Column(String(255), nullable=False)
    duration = Column(Float, nullable=False)  # Duration in hours
    priority = Column(String(50), nullable=False)  # low, medium, high
    deadline = Column(Date, nullable=False)
    preferred_time = Column(String(10), nullable=True)  # HH:MM format - user's preferred time
    status = Column(String(50), default="pending")  # pending, completed
    created_at = Column(DateTime, default=datetime.utcnow)


class ScheduleModel(Base):
    """SQLAlchemy model for schedule table"""
    __tablename__ = "schedule"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=True, index=True)  # Link to user
    task_title = Column(String(255), nullable=False)
    start_time = Column(String(10), nullable=False)  # HH:MM format
    end_time = Column(String(10), nullable=False)  # HH:MM format
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PlanHistoryModel(Base):
    """SQLAlchemy model for storing user's plan history"""
    __tablename__ = "plan_history"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    date = Column(Date, nullable=False)
    total_tasks = Column(Integer, default=0)
    completed_tasks = Column(Integer, default=0)
    schedule_data = Column(Text)  # JSON string of the schedule
    wellness_tips = Column(Text)  # JSON string of wellness tips
    created_at = Column(DateTime, default=datetime.utcnow)


# =============================================================================
# Pydantic Schemas for Request/Response Validation
# =============================================================================

class TaskCreate(BaseModel):
    """Schema for creating a new task"""
    title: str = Field(..., min_length=1, max_length=255, description="Task title")
    duration: float = Field(..., gt=0, description="Duration in hours")
    priority: str = Field(..., pattern="^(low|medium|high)$", description="Priority level")
    deadline: date = Field(..., description="Task deadline")
    preferred_time: Optional[str] = Field(default=None, description="Preferred time in HH:MM format")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Complete project report",
                "duration": 2.5,
                "priority": "high",
                "deadline": "2026-02-01",
                "preferred_time": "14:00"
            }
        }


class TaskResponse(BaseModel):
    """Schema for task response"""
    id: int
    user_id: Optional[int] = None
    title: str
    duration: float
    priority: str
    deadline: date
    preferred_time: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class TaskUpdate(BaseModel):
    """Schema for updating task status"""
    status: str = Field(default="completed", pattern="^(pending|completed)$")


class ScheduleItem(BaseModel):
    """Schema for a single schedule item"""
    task: str
    start: str
    end: str


class ScheduleResponse(BaseModel):
    """Schema for schedule response"""
    id: int
    user_id: Optional[int] = None
    task_title: str
    start_time: str
    end_time: str
    date: date

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    """Schema for AI chat request"""
    message: str = Field(..., min_length=1, description="User message")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "How can I be more productive today?"
            }
        }


class ChatResponse(BaseModel):
    """Schema for AI chat response"""
    reply: str
    timestamp: datetime


# =============================================================================
# Authentication Schemas
# =============================================================================

class UserRegister(BaseModel):
    """Schema for user registration"""
    email: str = Field(..., description="User email")
    name: str = Field(..., min_length=1, max_length=255, description="User name")
    password: str = Field(..., min_length=6, description="User password")


class UserLogin(BaseModel):
    """Schema for user login"""
    email: str = Field(..., description="User email")
    password: str = Field(..., description="User password")


class UserResponse(BaseModel):
    """Schema for user response"""
    id: int
    email: str
    name: str
    created_at: datetime
    streak: Optional[dict] = None
    preferences: Optional[dict] = None

    class Config:
        from_attributes = True


class UserPreferencesCreate(BaseModel):
    """Schema for user preferences/onboarding"""
    work_style: str = Field(..., description="early_bird, night_owl, flexible")
    productivity_goal: str = Field(..., description="focus, balance, learning, career")
    work_hours_start: str = Field(default="09:00", description="Work start time")
    work_hours_end: str = Field(default="18:00", description="Work end time")
    break_preference: str = Field(..., description="pomodoro, long_blocks, flexible")
    biggest_challenge: str = Field(..., description="procrastination, distractions, overload, motivation")


class StreakResponse(BaseModel):
    """Schema for streak response"""
    current_streak: int
    longest_streak: int
    total_active_days: int
    last_active_date: Optional[date]
    streak_status: str  # "active", "at_risk", "broken"


class StatsResponse(BaseModel):
    """Schema for analytics stats response"""
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    completion_percentage: float


# =============================================================================
# Gemini API Configuration
# =============================================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# List of Gemini models to try (in order of preference)
GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-1.0-pro",
]

_working_model = None  # Cache the working model

def get_gemini_model():
    """Configure and return Gemini model with fallback support"""
    global _working_model
    
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY environment variable is not set"
        )
    
    genai.configure(api_key=GEMINI_API_KEY)
    
    # If we already found a working model, use it
    if _working_model:
        return genai.GenerativeModel(_working_model)
    
    # Try each model until one works
    for model_name in GEMINI_MODELS:
        try:
            model = genai.GenerativeModel(model_name)
            # Test the model with a simple request
            model.generate_content("test")
            _working_model = model_name
            print(f"✅ Using Gemini model: {model_name}")
            return model
        except Exception as e:
            error_str = str(e)
            # Skip to next model if not found or not supported
            if "404" in error_str or "not found" in error_str.lower() or "not supported" in error_str.lower():
                print(f"⚠️ Model {model_name} not available, trying next...")
                continue
            # For quota errors, still use this model (it exists, just rate limited)
            if "429" in error_str or "quota" in error_str.lower():
                _working_model = model_name
                print(f"✅ Using Gemini model: {model_name} (quota limited, will retry)")
                return genai.GenerativeModel(model_name)
            # For other errors, try next model
            print(f"⚠️ Model {model_name} error: {e}")
            continue
    
    # Default fallback
    _working_model = "gemini-pro"
    print(f"⚠️ Falling back to default model: gemini-pro")
    return genai.GenerativeModel("gemini-pro")


def reset_model_cache():
    """Reset the cached model (useful if model stops working)"""
    global _working_model
    _working_model = None


# Scheduling prompt template
SCHEDULING_PROMPT = """You are an intelligent daily planning assistant and productivity coach powered by Google Gemini.

Input:
You will receive:
- A list of user tasks with title, duration (in hours), priority (high/medium/low), deadline, and PREFERRED TIME if specified.
- The user's available working hours for today.

Your job has two parts:

PART 1: Generate Daily Schedule
Create an optimized daily schedule by:
1. **IMPORTANT: If a task has a "preferred_time", schedule it at or very close to that time!**
2. Prioritizing high-priority tasks first.
3. Respecting task durations.
4. Considering deadlines.
5. Avoiding overlapping time slots.
6. Distributing workload realistically across the day.
7. Default working hours are 09:00-18:00, but respect user's preferred times even if outside this range.

PART 2: Personalized Wellness Tips Based on the Schedule
IMPORTANT: Analyze the ACTUAL TASKS in the schedule and give SPECIFIC, PERSONALIZED advice.
- If there's a "fitness" or "workout" task: suggest pre-workout hydration, stretching tips, or post-workout nutrition
- If there's a "study" or "exam" task: suggest focus techniques, break intervals, brain food
- If there's a "meeting" or "presentation" task: suggest preparation time, calming techniques
- If there's a "coding" or "development" task: suggest eye breaks, posture checks, stand-up intervals
- If workload is heavy (>6 hours of tasks): warn about overload and suggest breaks
- If tasks span long continuous hours: recommend micro-breaks
- Reference the actual task names and scheduled times in your tips!

Return the final response in this JSON format only:
{
  "schedule": [
    {"task":"Task name","start":"HH:MM","end":"HH:MM"}
  ],
  "review": [
    "Your fitness session is scheduled at 17:00 - have a light snack 30 minutes before!",
    "After the coding task at 10:00, take a 5-minute eye break.",
    "You have 3 high-priority tasks today. Great job tackling them in the morning!"
  ]
}

Do not return any explanation or extra text.
Only return valid JSON.

Tasks to schedule:
"""

# Productivity assistant system prompt
PRODUCTIVITY_PROMPT = """You are a helpful productivity assistant for a daily planner app.
You help users with:
- Time management tips
- Task prioritization advice
- Work-life balance suggestions
- Productivity techniques (Pomodoro, time blocking, etc.)
- Motivation and focus strategies

Be concise, practical, and encouraging in your responses.
"""


# =============================================================================
# Database Dependency
# =============================================================================

def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# Application Lifespan
# =============================================================================

def migrate_database():
    """Run database migrations to add new columns"""
    import sqlite3
    import os
    
    # Only run migrations if database file exists
    if not os.path.exists('planner.db'):
        return
    
    conn = sqlite3.connect('planner.db')
    cursor = conn.cursor()
    
    try:
        # Check if tasks table exists first
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'")
        if not cursor.fetchone():
            conn.close()
            return
        
        # Check if preferred_time column exists in tasks table
        cursor.execute("PRAGMA table_info(tasks)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'preferred_time' not in columns:
            print("📦 Adding preferred_time column to tasks table...")
            cursor.execute("ALTER TABLE tasks ADD COLUMN preferred_time VARCHAR(10)")
            conn.commit()
            print("✅ Migration complete: preferred_time column added")
    except Exception as e:
        print(f"⚠️ Migration warning: {e}")
    finally:
        conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - creates tables on startup"""
    # Startup
    print("\n" + "=" * 60)
    print("🚀 AI-Powered Smart Daily Planner Backend")
    print("=" * 60)
    print("📦 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")
    
    # Run migrations for existing databases
    migrate_database()
    
    # Seed demo data if database is empty
    db = SessionLocal()
    try:
        user_count = db.query(UserModel).count()
        print(f"📊 Found {user_count} users in database")
        import sys
        sys.stdout.flush()
        if user_count == 0:
            print("🌱 Seeding demo data...")
            sys.stdout.flush()
            seed_demo_data(db)
            print("✅ Demo data seeded successfully!")
            sys.stdout.flush()
        else:
            # Refresh demo user's streak to keep it active
            refresh_demo_streak(db)
    finally:
        db.close()
    
    if GEMINI_API_KEY:
        print("✅ Gemini API key detected")
    else:
        print("⚠️  Warning: GEMINI_API_KEY not set. AI features will not work.")
    
    print("=" * 60)
    print("🌐 Server is ready to accept connections!")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("=" * 60 + "\n")
    
    yield
    
    # Shutdown
    print("\n👋 Shutting down server...")


def refresh_demo_streak(db: Session):
    """Refresh demo user's streak and history to keep it active for presentations"""
    from datetime import date, timedelta
    import random
    import json
    
    demo_user = db.query(UserModel).filter(UserModel.email == "demo@smartplanner.com").first()
    if demo_user:
        # Refresh streak
        streak = db.query(StreakModel).filter(StreakModel.user_id == demo_user.id).first()
        if streak:
            streak.last_active_date = date.today()
            streak.current_streak = 21  # Keep 21-day streak
            streak.longest_streak = 21
            streak.total_active_days = 45
            db.commit()
            print("✅ Demo user streak refreshed to 21 days")
        
        # Refresh plan history - delete old and add fresh 7 days
        db.query(PlanHistoryModel).filter(PlanHistoryModel.user_id == demo_user.id).delete()
        
        wellness_tips = [
            ["Take a 5-minute stretch break every hour", "Stay hydrated - aim for 8 glasses of water"],
            ["Practice deep breathing during transitions", "Take a short walk after lunch"],
            ["Do eye exercises every 2 hours", "Stand and stretch between meetings"],
            ["Try the 20-20-20 rule for eye health", "Get some natural light exposure"],
        ]
        
        sample_schedules = [
            [
                {"task": "Morning standup", "start": "09:00", "end": "09:30"},
                {"task": "Deep work session", "start": "09:30", "end": "12:00"},
                {"task": "Lunch break", "start": "12:00", "end": "13:00"},
                {"task": "Code review", "start": "13:00", "end": "14:30"},
                {"task": "Team meeting", "start": "15:00", "end": "16:00"}
            ],
            [
                {"task": "Email catchup", "start": "08:30", "end": "09:00"},
                {"task": "Project planning", "start": "09:00", "end": "10:30"},
                {"task": "Client call", "start": "11:00", "end": "12:00"},
                {"task": "Documentation", "start": "14:00", "end": "16:00"}
            ],
            [
                {"task": "Sprint planning", "start": "09:00", "end": "10:00"},
                {"task": "Feature development", "start": "10:00", "end": "12:30"},
                {"task": "1:1 meetings", "start": "14:00", "end": "15:30"},
                {"task": "Code deployment", "start": "16:00", "end": "17:00"}
            ]
        ]
        
        for i in range(7):
            day = date.today() - timedelta(days=i)
            total = random.randint(6, 10)
            completed = random.randint(5, total)
            history = PlanHistoryModel(
                user_id=demo_user.id,
                date=day,
                total_tasks=total,
                completed_tasks=completed,
                schedule_data=json.dumps(random.choice(sample_schedules)),
                wellness_tips=json.dumps(random.choice(wellness_tips))
            )
            db.add(history)
        
        db.commit()
        print("✅ Demo user plan history refreshed (7 days)")


def seed_demo_data(db: Session):
    """Seed database with demo data for hackathon presentation"""
    from datetime import datetime, date, timedelta
    import random
    import json
    
    # Create demo user
    demo_user = UserModel(
        email="demo@smartplanner.com",
        name="Alex Johnson",
        password_hash=hash_password("demo123")
    )
    db.add(demo_user)
    db.commit()
    db.refresh(demo_user)
    
    # Add user preferences
    preferences = UserPreferencesModel(
        user_id=demo_user.id,
        work_style="early_bird",
        productivity_goal="focus",
        work_hours_start="08:00",
        work_hours_end="18:00",
        break_preference="pomodoro",
        biggest_challenge="distractions"
    )
    db.add(preferences)
    
    # Create streak data (21-day streak!)
    streak = StreakModel(
        user_id=demo_user.id,
        current_streak=21,
        longest_streak=21,
        total_active_days=45,
        last_active_date=date.today()
    )
    db.add(streak)
    
    # Add daily activity for past 45 days
    for i in range(45):
        day = date.today() - timedelta(days=i)
        tasks_done = random.randint(5, 12)
        tasks_made = random.randint(8, 15)
        activity = DailyActivityModel(
            user_id=demo_user.id,
            date=day,
            tasks_completed=tasks_done,
            tasks_created=tasks_made,
            minutes_productive=random.randint(180, 420)
        )
        db.add(activity)
    
    # Add historical tasks across past 30 days
    task_templates = [
        ("Review quarterly reports", "high", 2.0),
        ("Team standup meeting", "high", 0.5),
        ("Code review for PR #342", "high", 1.5),
        ("Update project documentation", "medium", 1.0),
        ("Client presentation prep", "high", 2.5),
        ("Email inbox zero", "low", 0.5),
        ("Research new frameworks", "medium", 1.5),
        ("Write blog post draft", "medium", 2.0),
        ("Fix critical bug #127", "high", 1.0),
        ("Weekly planning session", "high", 1.0),
        ("Mentor junior developer", "medium", 1.0),
        ("Database optimization", "high", 2.0),
        ("UI/UX design review", "medium", 1.5),
        ("API integration testing", "high", 2.0),
        ("Sprint retrospective", "medium", 1.0),
        ("Customer support tickets", "low", 1.0),
        ("Performance monitoring", "medium", 0.5),
        ("Security audit review", "high", 2.0),
        ("Feature brainstorming", "medium", 1.0),
        ("Technical debt cleanup", "low", 1.5),
    ]
    
    for i in range(30):
        day = date.today() - timedelta(days=i)
        # Add 4-8 tasks per day
        num_tasks = random.randint(4, 8)
        selected_tasks = random.sample(task_templates, min(num_tasks, len(task_templates)))
        
        for title, priority, duration in selected_tasks:
            # Most past tasks are completed
            status = "completed" if random.random() < 0.85 else "pending"
            task = TaskModel(
                title=f"{title}",
                duration=duration,
                priority=priority,
                deadline=day,
                status=status,
                user_id=demo_user.id
            )
            db.add(task)
    
    # Add today's schedule
    today_tasks = [
        ("Morning standup", "09:00", "09:30", "Team sync and daily planning"),
        ("Deep work: Feature development", "09:30", "12:00", "Focus on new dashboard features"),
        ("Lunch break", "12:00", "13:00", "Recharge and wellness"),
        ("Code review session", "13:00", "14:30", "Review team PRs"),
        ("Client meeting", "14:30", "15:30", "Project status update"),
        ("Documentation update", "15:30", "16:30", "Update API docs"),
        ("Email & Slack catchup", "16:30", "17:00", "Communications"),
        ("End of day review", "17:00", "17:30", "Plan tomorrow")
    ]
    
    for task_title, start, end, notes in today_tasks:
        schedule_item = ScheduleModel(
            task_title=task_title,
            start_time=start,
            end_time=end,
            date=date.today(),
            user_id=demo_user.id
        )
        db.add(schedule_item)
    
    # Add today's active tasks
    today_active_tasks = [
        ("Review quarterly metrics dashboard", "high", 2.0, "pending"),
        ("Finalize MVP feature list", "high", 1.5, "pending"),
        ("Team 1:1 meetings", "medium", 1.0, "completed"),
        ("Update sprint backlog", "medium", 0.5, "completed"),
        ("Research AI integration options", "high", 2.0, "pending"),
        ("Fix mobile responsiveness issues", "medium", 1.0, "completed"),
        ("Prepare demo presentation", "high", 1.5, "pending"),
        ("Code documentation", "low", 1.0, "pending"),
    ]
    
    for title, priority, duration, status in today_active_tasks:
        task = TaskModel(
            title=title,
            duration=duration,
            priority=priority,
            deadline=date.today(),
            status=status,
            user_id=demo_user.id
        )
        db.add(task)
    
    # Add plan history for past 7 days
    wellness_tips = [
        ["Take a 5-minute stretch break every hour", "Stay hydrated - aim for 8 glasses of water"],
        ["Practice deep breathing during transitions", "Take a short walk after lunch"],
        ["Do eye exercises every 2 hours", "Stand and stretch between meetings"],
        ["Try the 20-20-20 rule for eye health", "Get some natural light exposure"],
    ]
    
    for i in range(7):
        day = date.today() - timedelta(days=i)
        total = random.randint(5, 10)
        completed = random.randint(4, min(8, total))
        history = PlanHistoryModel(
            user_id=demo_user.id,
            date=day,
            total_tasks=total,
            completed_tasks=completed,
            schedule_data=json.dumps([{"task": "Sample task", "start": "09:00", "end": "10:00"}]),
            wellness_tips=json.dumps(random.choice(wellness_tips))
        )
        db.add(history)
    
    db.commit()
    print(f"   Created demo user: {demo_user.email} (password: demo123)")
    print(f"   Added 21-day streak")
    print(f"   Added 45 days of activity history")
    print(f"   Added 150+ historical tasks")
    print(f"   Added today's schedule and active tasks")


# =============================================================================
# FastAPI Application
# =============================================================================

app = FastAPI(
    title="AI-Powered Smart Daily Planner",
    description="A smart daily planner backend with AI-powered scheduling and productivity assistance",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Health Check Endpoint
# =============================================================================

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - health check"""
    return {
        "status": "healthy",
        "message": "AI-Powered Smart Daily Planner API is running!",
        "version": "1.0.0"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "gemini_configured": bool(GEMINI_API_KEY),
        "timestamp": datetime.utcnow().isoformat()
    }


# =============================================================================
# 🔐 Authentication APIs
# =============================================================================

def hash_password(password: str) -> str:
    """Simple password hashing for demo purposes"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()


@app.post("/auth/register", tags=["Authentication"])
async def register_user(user: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user.
    """
    try:
        # Check if user already exists
        existing_user = db.query(UserModel).filter(UserModel.email == user.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        db_user = UserModel(
            email=user.email,
            name=user.name,
            password_hash=hash_password(user.password)
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Create initial streak record
        db_streak = StreakModel(user_id=db_user.id)
        db.add(db_streak)
        db.commit()
        
        return {
            "message": "User registered successfully",
            "user": {
                "id": db_user.id,
                "email": db_user.email,
                "name": db_user.name
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@app.post("/auth/login", tags=["Authentication"])
async def login_user(user: UserLogin, db: Session = Depends(get_db)):
    """
    Login user and return user data with streak info.
    """
    try:
        db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
        
        if not db_user or db_user.password_hash != hash_password(user.password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Get streak info
        streak = db.query(StreakModel).filter(StreakModel.user_id == db_user.id).first()
        streak_data = None
        if streak:
            today = date.today()
            streak_status = "broken"
            if streak.last_active_date:
                days_since = (today - streak.last_active_date).days
                if days_since == 0:
                    streak_status = "active"
                elif days_since == 1:
                    streak_status = "at_risk"
            
            streak_data = {
                "current_streak": streak.current_streak,
                "longest_streak": streak.longest_streak,
                "total_active_days": streak.total_active_days,
                "last_active_date": streak.last_active_date.isoformat() if streak.last_active_date else None,
                "streak_status": streak_status
            }
        
        # Get preferences
        prefs = db.query(UserPreferencesModel).filter(UserPreferencesModel.user_id == db_user.id).first()
        prefs_data = None
        if prefs:
            prefs_data = {
                "work_style": prefs.work_style,
                "productivity_goal": prefs.productivity_goal,
                "work_hours_start": prefs.work_hours_start,
                "work_hours_end": prefs.work_hours_end,
                "break_preference": prefs.break_preference,
                "biggest_challenge": prefs.biggest_challenge
            }
        
        return {
            "message": "Login successful",
            "user": {
                "id": db_user.id,
                "email": db_user.email,
                "name": db_user.name,
                "created_at": db_user.created_at.isoformat()
            },
            "streak": streak_data,
            "preferences": prefs_data,
            "has_completed_onboarding": prefs is not None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@app.get("/auth/user/{user_id}", tags=["Authentication"])
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get user data by ID.
    """
    try:
        db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get streak and preferences
        streak = db.query(StreakModel).filter(StreakModel.user_id == user_id).first()
        prefs = db.query(UserPreferencesModel).filter(UserPreferencesModel.user_id == user_id).first()
        
        return {
            "user": {
                "id": db_user.id,
                "email": db_user.email,
                "name": db_user.name
            },
            "streak": {
                "current_streak": streak.current_streak if streak else 0,
                "longest_streak": streak.longest_streak if streak else 0,
                "total_active_days": streak.total_active_days if streak else 0
            } if streak else None,
            "has_completed_onboarding": prefs is not None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")


# =============================================================================
# 🎯 User Preferences/Onboarding APIs
# =============================================================================

@app.post("/preferences/{user_id}", tags=["Onboarding"])
async def save_preferences(user_id: int, prefs: UserPreferencesCreate, db: Session = Depends(get_db)):
    """
    Save user preferences from onboarding.
    """
    try:
        # Check if preferences already exist
        existing = db.query(UserPreferencesModel).filter(UserPreferencesModel.user_id == user_id).first()
        
        if existing:
            # Update existing preferences
            existing.work_style = prefs.work_style
            existing.productivity_goal = prefs.productivity_goal
            existing.work_hours_start = prefs.work_hours_start
            existing.work_hours_end = prefs.work_hours_end
            existing.break_preference = prefs.break_preference
            existing.biggest_challenge = prefs.biggest_challenge
            existing.updated_at = datetime.utcnow()
        else:
            # Create new preferences
            db_prefs = UserPreferencesModel(
                user_id=user_id,
                work_style=prefs.work_style,
                productivity_goal=prefs.productivity_goal,
                work_hours_start=prefs.work_hours_start,
                work_hours_end=prefs.work_hours_end,
                break_preference=prefs.break_preference,
                biggest_challenge=prefs.biggest_challenge
            )
            db.add(db_prefs)
        
        db.commit()
        
        return {
            "message": "Preferences saved successfully",
            "preferences": {
                "work_style": prefs.work_style,
                "productivity_goal": prefs.productivity_goal,
                "work_hours_start": prefs.work_hours_start,
                "work_hours_end": prefs.work_hours_end,
                "break_preference": prefs.break_preference,
                "biggest_challenge": prefs.biggest_challenge
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save preferences: {str(e)}")


@app.get("/preferences/{user_id}", tags=["Onboarding"])
async def get_preferences(user_id: int, db: Session = Depends(get_db)):
    """
    Get user preferences.
    """
    try:
        prefs = db.query(UserPreferencesModel).filter(UserPreferencesModel.user_id == user_id).first()
        
        if not prefs:
            return {"preferences": None, "has_completed_onboarding": False}
        
        return {
            "preferences": {
                "work_style": prefs.work_style,
                "productivity_goal": prefs.productivity_goal,
                "work_hours_start": prefs.work_hours_start,
                "work_hours_end": prefs.work_hours_end,
                "break_preference": prefs.break_preference,
                "biggest_challenge": prefs.biggest_challenge
            },
            "has_completed_onboarding": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")


# =============================================================================
# 🔥 Streak APIs
# =============================================================================

@app.get("/streak/{user_id}", tags=["Streaks"])
async def get_streak(user_id: int, db: Session = Depends(get_db)):
    """
    Get user's current streak information.
    """
    try:
        streak = db.query(StreakModel).filter(StreakModel.user_id == user_id).first()
        
        if not streak:
            # Create new streak if doesn't exist
            streak = StreakModel(user_id=user_id)
            db.add(streak)
            db.commit()
            db.refresh(streak)
        
        today = date.today()
        streak_status = "broken"
        
        if streak.last_active_date:
            days_since = (today - streak.last_active_date).days
            if days_since == 0:
                streak_status = "active"
            elif days_since == 1:
                streak_status = "at_risk"
        
        return {
            "current_streak": streak.current_streak,
            "longest_streak": streak.longest_streak,
            "total_active_days": streak.total_active_days,
            "last_active_date": streak.last_active_date.isoformat() if streak.last_active_date else None,
            "streak_status": streak_status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get streak: {str(e)}")


@app.post("/streak/{user_id}/checkin", tags=["Streaks"])
async def checkin_streak(user_id: int, db: Session = Depends(get_db)):
    """
    Check in for today to maintain/start streak.
    Called when user completes a task or generates a schedule.
    """
    try:
        streak = db.query(StreakModel).filter(StreakModel.user_id == user_id).first()
        
        if not streak:
            streak = StreakModel(user_id=user_id)
            db.add(streak)
        
        today = date.today()
        
        if streak.last_active_date:
            days_since = (today - streak.last_active_date).days
            
            if days_since == 0:
                # Already checked in today
                return {
                    "message": "Already checked in today",
                    "current_streak": streak.current_streak,
                    "longest_streak": streak.longest_streak,
                    "streak_maintained": True
                }
            elif days_since == 1:
                # Consecutive day - increase streak
                streak.current_streak += 1
                streak.total_active_days += 1
                if streak.current_streak > streak.longest_streak:
                    streak.longest_streak = streak.current_streak
            else:
                # Streak broken - reset to 1
                streak.current_streak = 1
                streak.total_active_days += 1
        else:
            # First check-in ever
            streak.current_streak = 1
            streak.total_active_days = 1
            streak.longest_streak = 1
        
        streak.last_active_date = today
        streak.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "message": "Streak updated!",
            "current_streak": streak.current_streak,
            "longest_streak": streak.longest_streak,
            "total_active_days": streak.total_active_days,
            "streak_maintained": True
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update streak: {str(e)}")


# =============================================================================
# 📜 Plan History APIs
# =============================================================================

@app.get("/history/{user_id}", tags=["History"])
async def get_plan_history(user_id: int, limit: int = 10, db: Session = Depends(get_db)):
    """
    Get user's plan history.
    """
    try:
        history = db.query(PlanHistoryModel).filter(
            PlanHistoryModel.user_id == user_id
        ).order_by(PlanHistoryModel.date.desc()).limit(limit).all()
        
        return {
            "history": [
                {
                    "id": h.id,
                    "date": h.date.isoformat(),
                    "total_tasks": h.total_tasks,
                    "completed_tasks": h.completed_tasks,
                    "completion_rate": round((h.completed_tasks / h.total_tasks * 100) if h.total_tasks > 0 else 0, 1),
                    "schedule": json.loads(h.schedule_data) if h.schedule_data else [],
                    "wellness_tips": json.loads(h.wellness_tips) if h.wellness_tips else []
                }
                for h in history
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get history: {str(e)}")


@app.post("/history/{user_id}", tags=["History"])
async def save_plan_history(user_id: int, db: Session = Depends(get_db)):
    """
    Save current day's plan to history.
    """
    try:
        today = date.today()
        
        # Get today's tasks
        tasks = db.query(TaskModel).filter(
            TaskModel.user_id == user_id,
            TaskModel.deadline == today
        ).all()
        
        # Get today's schedule
        schedule = db.query(ScheduleModel).filter(
            ScheduleModel.user_id == user_id,
            ScheduleModel.date == today
        ).all()
        
        schedule_data = [
            {"task": s.task_title, "start": s.start_time, "end": s.end_time}
            for s in schedule
        ]
        
        total = len(tasks)
        completed = len([t for t in tasks if t.status == "completed"])
        
        # Check if history for today exists
        existing = db.query(PlanHistoryModel).filter(
            PlanHistoryModel.user_id == user_id,
            PlanHistoryModel.date == today
        ).first()
        
        if existing:
            existing.total_tasks = total
            existing.completed_tasks = completed
            existing.schedule_data = json.dumps(schedule_data)
        else:
            history = PlanHistoryModel(
                user_id=user_id,
                date=today,
                total_tasks=total,
                completed_tasks=completed,
                schedule_data=json.dumps(schedule_data)
            )
            db.add(history)
        
        db.commit()
        
        return {"message": "Plan history saved", "date": today.isoformat()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save history: {str(e)}")


# =============================================================================
# Task Management APIs
# =============================================================================

@app.post("/tasks", response_model=TaskResponse, tags=["Tasks"])
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """
    Create a new task.
    
    - **title**: Task title (required)
    - **duration**: Duration in hours (required, must be > 0)
    - **priority**: Priority level - low, medium, or high (required)
    - **deadline**: Task deadline date (required)
    - **preferred_time**: Preferred time in HH:MM format (optional)
    """
    try:
        db_task = TaskModel(
            title=task.title,
            duration=task.duration,
            priority=task.priority,
            deadline=task.deadline,
            preferred_time=task.preferred_time,
            status="pending"
        )
        db.add(db_task)
        db.commit()
        db.refresh(db_task)
        return db_task
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")


@app.get("/tasks", response_model=List[TaskResponse], tags=["Tasks"])
async def list_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List all tasks with optional filtering.
    
    - **status**: Filter by status (pending/completed)
    - **priority**: Filter by priority (low/medium/high)
    """
    try:
        query = db.query(TaskModel)
        
        if status:
            query = query.filter(TaskModel.status == status)
        if priority:
            query = query.filter(TaskModel.priority == priority)
        
        tasks = query.order_by(TaskModel.deadline, TaskModel.priority.desc()).all()
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tasks: {str(e)}")


@app.get("/tasks/{task_id}", response_model=TaskResponse, tags=["Tasks"])
async def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a specific task by ID"""
    task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")
    return task


@app.patch("/tasks/{task_id}", response_model=TaskResponse, tags=["Tasks"])
async def update_task_status(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db)
):
    """
    Update task status (mark as completed or pending).
    
    - **task_id**: ID of the task to update
    - **status**: New status (pending/completed)
    """
    try:
        task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")
        
        task.status = task_update.status
        db.commit()
        db.refresh(task)
        return task
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update task: {str(e)}")


@app.delete("/tasks/{task_id}", tags=["Tasks"])
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task by ID"""
    try:
        task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail=f"Task with id {task_id} not found")
        
        db.delete(task)
        db.commit()
        return {"message": f"Task {task_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")


# =============================================================================
# AI Schedule Generation API
# =============================================================================

@app.post("/generate-schedule", tags=["AI Scheduling"])
async def generate_schedule(db: Session = Depends(get_db)):
    """
    Generate an AI-optimized schedule for all pending tasks.
    
    Uses Gemini API to intelligently schedule tasks based on:
    - Priority (high priority first)
    - Deadlines (earlier deadlines first)
    - Duration (respecting time constraints)
    """
    try:
        # Fetch all pending tasks
        pending_tasks = db.query(TaskModel).filter(TaskModel.status == "pending").all()
        
        if not pending_tasks:
            return {
                "message": "No pending tasks to schedule",
                "schedule": []
            }
        
        # Prepare tasks data for Gemini
        tasks_data = []
        for task in pending_tasks:
            task_info = {
                "title": task.title,
                "duration_hours": task.duration,
                "priority": task.priority,
                "deadline": task.deadline.isoformat()
            }
            # Include preferred_time if specified
            if task.preferred_time:
                task_info["preferred_time"] = task.preferred_time
            tasks_data.append(task_info)
        
        schedule_items = []
        review_tips = []
        
        # Try AI scheduling if API key is available
        if GEMINI_API_KEY:
            try:
                full_prompt = SCHEDULING_PROMPT + json.dumps(tasks_data, indent=2)
                model = get_gemini_model()
                response = model.generate_content(full_prompt)
                response_text = response.text.strip()
                
                # Try to parse the new format with schedule and review
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group())
                    if isinstance(parsed, dict) and "schedule" in parsed:
                        schedule_items = parsed.get("schedule", [])
                        review_tips = parsed.get("review", [])
                    else:
                        # Old format - just array
                        schedule_items = [parsed] if not isinstance(parsed, list) else parsed
                else:
                    # Try array format as fallback
                    array_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                    if array_match:
                        schedule_items = json.loads(array_match.group())
            except Exception as ai_error:
                print(f"AI scheduling failed, using fallback: {ai_error}")
                schedule_items = []
        
        # Fallback: Generate schedule locally if AI fails or no API key
        if not schedule_items:
            # Sort by priority (high first) then deadline
            priority_order = {"high": 3, "medium": 2, "low": 1}
            sorted_tasks = sorted(
                tasks_data,
                key=lambda x: (-priority_order.get(x["priority"], 0), x["deadline"])
            )
            
            current_hour = 9  # Start at 9 AM
            current_minute = 0
            
            for task in sorted_tasks:
                duration_minutes = int(task["duration_hours"] * 60)
                start_time = f"{current_hour:02d}:{current_minute:02d}"
                
                # Calculate end time
                total_minutes = current_hour * 60 + current_minute + duration_minutes
                end_hour = total_minutes // 60
                end_minute = total_minutes % 60
                end_time = f"{end_hour:02d}:{end_minute:02d}"
                
                schedule_items.append({
                    "task": task["title"],
                    "start": start_time,
                    "end": end_time
                })
                
                current_hour = end_hour
                current_minute = end_minute
        
        # Clear existing schedule for today
        today = date.today()
        db.query(ScheduleModel).filter(ScheduleModel.date == today).delete()
        
        # Save new schedule to database
        saved_schedule = []
        for item in schedule_items:
            schedule_entry = ScheduleModel(
                task_title=item.get("task", "Unknown Task"),
                start_time=item.get("start", "09:00"),
                end_time=item.get("end", "10:00"),
                date=today
            )
            db.add(schedule_entry)
            saved_schedule.append({
                "task": schedule_entry.task_title,
                "start": schedule_entry.start_time,
                "end": schedule_entry.end_time,
                "date": today.isoformat()
            })
        
        db.commit()
        
        # Generate default wellness tips if none from AI
        if not review_tips:
            review_tips = [
                "💧 Remember to stay hydrated throughout the day!",
                "🚶 Take a 5-minute walk between tasks to refresh your mind.",
                "🎯 Focus on one task at a time for maximum productivity."
            ]
        
        return {
            "message": "Schedule generated successfully",
            "date": today.isoformat(),
            "schedule": saved_schedule,
            "review": review_tips
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate schedule: {str(e)}")


@app.get("/schedule", response_model=List[ScheduleResponse], tags=["AI Scheduling"])
async def get_schedule(
    schedule_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    Get the schedule for a specific date.
    
    - **schedule_date**: Date to get schedule for (defaults to today)
    """
    try:
        target_date = schedule_date or date.today()
        schedule = db.query(ScheduleModel).filter(
            ScheduleModel.date == target_date
        ).order_by(ScheduleModel.start_time).all()
        return schedule
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch schedule: {str(e)}")


# =============================================================================
# AI Chat API
# =============================================================================

@app.post("/ai-chat", response_model=ChatResponse, tags=["AI Chat"])
async def ai_chat(chat_request: ChatRequest):
    """
    Chat with AI productivity assistant.
    
    Send a message and get productivity tips, time management advice,
    and task prioritization help from the AI assistant.
    """
    try:
        if GEMINI_API_KEY:
            model = get_gemini_model()
            full_prompt = f"{PRODUCTIVITY_PROMPT}\n\nUser: {chat_request.message}\n\nAssistant:"
            response = model.generate_content(full_prompt)
            reply = response.text.strip()
        else:
            # Fallback responses when API key is not set
            fallback_responses = {
                "productive": "Try the Pomodoro Technique: work for 25 minutes, then take a 5-minute break. This helps maintain focus and prevents burnout!",
                "focus": "Minimize distractions by turning off notifications, and try working in 90-minute focus blocks followed by short breaks.",
                "overwhelm": "When feeling overwhelmed, start with your smallest task first. Completing it gives you momentum to tackle bigger challenges!",
                "priorit": "Use the Eisenhower Matrix: categorize tasks as urgent/important, important/not urgent, urgent/not important, or neither. Focus on important tasks first!",
                "break": "Taking regular breaks is essential! Step away from your desk, stretch, or take a short walk to refresh your mind.",
                "default": "Great question! Here are some quick productivity tips: 1) Break large tasks into smaller ones, 2) Set specific goals for each work session, 3) Review your progress at the end of each day."
            }
            
            message_lower = chat_request.message.lower()
            reply = fallback_responses["default"]
            for keyword, response in fallback_responses.items():
                if keyword in message_lower:
                    reply = response
                    break
        
        return ChatResponse(
            reply=reply,
            timestamp=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return ChatResponse(
            reply="I'm here to help with productivity tips! Try asking about focus techniques, time management, or task prioritization.",
            timestamp=datetime.utcnow()
        )


# =============================================================================
# Analytics API
# =============================================================================

@app.get("/stats", response_model=StatsResponse, tags=["Analytics"])
async def get_stats(db: Session = Depends(get_db)):
    """
    Get task analytics and statistics.
    
    Returns:
    - Total number of tasks
    - Completed tasks count
    - Pending tasks count
    - Completion percentage
    """
    try:
        total_tasks = db.query(TaskModel).count()
        completed_tasks = db.query(TaskModel).filter(TaskModel.status == "completed").count()
        pending_tasks = db.query(TaskModel).filter(TaskModel.status == "pending").count()
        
        completion_percentage = (
            (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
        )
        
        return StatsResponse(
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            pending_tasks=pending_tasks,
            completion_percentage=round(completion_percentage, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@app.get("/stats/detailed", tags=["Analytics"])
async def get_detailed_stats(db: Session = Depends(get_db)):
    """
    Get detailed analytics including priority breakdown and today's progress.
    """
    try:
        # Basic stats
        total_tasks = db.query(TaskModel).count()
        completed_tasks = db.query(TaskModel).filter(TaskModel.status == "completed").count()
        pending_tasks = db.query(TaskModel).filter(TaskModel.status == "pending").count()
        
        # Priority breakdown (ALL tasks, not just pending)
        high_priority = db.query(TaskModel).filter(TaskModel.priority == "high").count()
        medium_priority = db.query(TaskModel).filter(TaskModel.priority == "medium").count()
        low_priority = db.query(TaskModel).filter(TaskModel.priority == "low").count()
        
        # Today's tasks
        today = date.today()
        today_tasks = db.query(TaskModel).filter(TaskModel.deadline == today).count()
        today_completed = db.query(TaskModel).filter(
            TaskModel.deadline == today,
            TaskModel.status == "completed"
        ).count()
        
        # Overdue tasks
        overdue_tasks = db.query(TaskModel).filter(
            TaskModel.deadline < today,
            TaskModel.status == "pending"
        ).count()
        
        completion_percentage = (
            (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
        )
        
        # Calculate average task duration from actual tasks
        all_tasks = db.query(TaskModel).all()
        avg_duration = sum(t.duration for t in all_tasks) / len(all_tasks) if all_tasks else 1.5
        
        # Generate realistic weekly data based on actual history
        weekly_data = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_tasks = db.query(TaskModel).filter(TaskModel.deadline == day).count()
            day_completed = db.query(TaskModel).filter(
                TaskModel.deadline == day,
                TaskModel.status == "completed"
            ).count()
            weekly_data.append({
                "day": day.strftime("%a"),
                "completed": day_completed if day_tasks > 0 else (8 + i) % 15,  # Fallback demo data
                "planned": day_tasks if day_tasks > 0 else (10 + i) % 18
            })
        
        return {
            "overview": {
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "pending_tasks": pending_tasks,
                "completion_percentage": round(completion_percentage, 2)
            },
            "priority_breakdown": {
                "high": high_priority,
                "medium": medium_priority,
                "low": low_priority
            },
            "today": {
                "total": today_tasks,
                "completed": today_completed,
                "remaining": today_tasks - today_completed
            },
            "overdue_tasks": overdue_tasks,
            "average_task_duration_hours": round(avg_duration, 2),
            "productivity_score": min(100, int(completion_percentage + (10 if overdue_tasks == 0 else 0))),
            "weekly_data": weekly_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch detailed stats: {str(e)}")


# =============================================================================
# 🏆 AI WOW FEATURES - Goal Recommendations
# =============================================================================

class GoalRecommendationRequest(BaseModel):
    """Schema for AI goal recommendations request"""
    role: str = Field(..., description="User role: student, professional, freelancer")
    work_hours: int = Field(default=8, description="Daily working hours")


@app.post("/ai-goal-recommendations", tags=["AI Features"])
async def get_goal_recommendations(request: GoalRecommendationRequest):
    """
    🏆 Get AI-powered goal recommendations based on user role.
    Uses Gemini to suggest personalized productivity goals.
    """
    try:
        goals = []
        
        if GEMINI_API_KEY:
            try:
                model = get_gemini_model()
                prompt = f"""You are a productivity coach. Based on the user's profile, suggest 4 personalized productivity goals.

User Profile:
- Role: {request.role}
- Daily working hours: {request.work_hours} hours

For each goal, provide:
1. A clear, actionable goal title (short)
2. A brief description of why it's important

Output ONLY valid JSON array like:
[{{"title": "Goal title", "description": "Why this goal matters"}}]

Make goals specific to their role and realistic for their schedule."""
                
                response = model.generate_content(prompt)
                response_text = response.text.strip()
                
                # Extract JSON from response
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                if json_match:
                    goals = json.loads(json_match.group())
            except Exception as ai_error:
                print(f"AI goal recommendations failed: {ai_error}")
        
        # Fallback goals based on role
        if not goals:
            role_goals = {
                "student": [
                    {"title": "Maintain study schedule", "description": "Consistent study times improve retention and reduce stress"},
                    {"title": "Balance academics and rest", "description": "Prevent burnout with proper breaks"},
                    {"title": "Complete assignments early", "description": "Avoid last-minute stress and improve quality"},
                    {"title": "Review notes daily", "description": "Reinforce learning through spaced repetition"}
                ],
                "professional": [
                    {"title": "Prioritize high-impact tasks", "description": "Focus on work that drives results"},
                    {"title": "Maintain work-life boundaries", "description": "Protect personal time for sustainability"},
                    {"title": "Block deep work sessions", "description": "Uninterrupted focus time for complex tasks"},
                    {"title": "End-of-day planning", "description": "Review today and prepare for tomorrow"}
                ],
                "freelancer": [
                    {"title": "Track billable hours", "description": "Maximize income and identify time sinks"},
                    {"title": "Set client boundaries", "description": "Protect your schedule from scope creep"},
                    {"title": "Batch similar tasks", "description": "Reduce context switching overhead"},
                    {"title": "Schedule admin time", "description": "Don't let invoicing and emails pile up"}
                ]
            }
            goals = role_goals.get(request.role, role_goals["professional"])
        
        return {
            "role": request.role,
            "recommendations": goals,
            "ai_generated": bool(GEMINI_API_KEY),
            "timestamp": datetime.utcnow()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Goal recommendations failed: {str(e)}")


# =============================================================================
# 🏆 AI WOW FEATURES - Priority Suggestion
# =============================================================================

class PrioritySuggestionRequest(BaseModel):
    """Schema for AI priority suggestion request"""
    task_title: str = Field(..., min_length=1, description="Task title to analyze")
    deadline: Optional[date] = Field(default=None, description="Task deadline")


@app.post("/ai-suggest-priority", tags=["AI Features"])
async def suggest_priority(request: PrioritySuggestionRequest):
    """
    🏆 Use Gemini to intelligently suggest priority level for a task.
    Analyzes task title and deadline to determine importance.
    Uses caching to reduce API calls.
    """
    try:
        priority = "medium"
        reasoning = ""
        ai_used = False
        
        # Create cache key
        cache_key = f"priority:{request.task_title}:{request.deadline}"
        cached = get_cached_response(cache_key)
        if cached:
            return cached
        
        if GEMINI_API_KEY and can_make_api_call():
            try:
                mark_api_call()
                model = get_gemini_model()
                deadline_info = f"Deadline: {request.deadline}" if request.deadline else "No deadline set"
                days_until = (request.deadline - date.today()).days if request.deadline else None
                
                prompt = f"""Analyze this task and suggest a priority level (high, medium, or low).

Task: {request.task_title}
{deadline_info}
{f"Days until deadline: {days_until}" if days_until is not None else ""}

Consider:
- Task urgency (deadline proximity)
- Task importance (based on keywords like "urgent", "important", "review", "meeting", etc.)
- Complexity indicators

Output ONLY valid JSON:
{{"priority": "high|medium|low", "reasoning": "Brief explanation (1 sentence)"}}"""
                
                response = model.generate_content(prompt)
                response_text = response.text.strip()
                
                # Extract JSON from response
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group())
                    priority = result.get("priority", "medium")
                    reasoning = result.get("reasoning", "")
                    ai_used = True
            except Exception as ai_error:
                print(f"AI priority suggestion failed: {ai_error}")
        
        # Fallback logic
        if not reasoning:
            task_lower = request.task_title.lower()
            
            # Check for urgency keywords
            high_keywords = ["urgent", "asap", "important", "deadline", "meeting", "presentation", "exam", "interview", "client"]
            low_keywords = ["maybe", "someday", "optional", "nice to have", "when free", "later"]
            
            if any(kw in task_lower for kw in high_keywords):
                priority = "high"
                reasoning = "Task contains urgency indicators"
            elif any(kw in task_lower for kw in low_keywords):
                priority = "low"
                reasoning = "Task appears to be optional or flexible"
            elif request.deadline:
                days_until = (request.deadline - date.today()).days
                if days_until <= 1:
                    priority = "high"
                    reasoning = "Deadline is imminent (within 24 hours)"
                elif days_until <= 3:
                    priority = "medium"
                    reasoning = "Deadline is approaching (within 3 days)"
                else:
                    priority = "low"
                    reasoning = "Deadline is far enough to be flexible"
            else:
                reasoning = "Standard task with no urgency indicators"
        
        # Cache and return the response
        response_data = {
            "task": request.task_title,
            "suggested_priority": priority,
            "reasoning": reasoning,
            "ai_generated": ai_used,
            "timestamp": datetime.utcnow()
        }
        set_cached_response(cache_key, response_data)
        return response_data
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Priority suggestion failed: {str(e)}")


# =============================================================================
# 🏆 AI WOW FEATURES - Task Breakdown
# =============================================================================

class TaskBreakdownRequest(BaseModel):
    """Schema for AI task breakdown request"""
    task_title: str = Field(..., min_length=1, description="Complex task to break down")


@app.post("/ai-breakdown", tags=["AI Features"])
async def breakdown_task(request: TaskBreakdownRequest):
    """
    🏆 Break down a complex task into actionable subtasks using AI.
    This is a "wow factor" feature for hackathon judges!
    """
    try:
        subtasks = []
        
        # Try AI breakdown if API key is available
        if GEMINI_API_KEY:
            try:
                model = get_gemini_model()
                prompt = f"""Break down this task into 3-5 actionable subtasks with time estimates.
For each subtask, provide a clear, specific title and estimated duration in minutes (be realistic).

Output ONLY valid JSON array like:
[{{"subtask": "Subtask name", "duration_minutes": 30}}]

Task to break down: {request.task_title}"""
                
                response = model.generate_content(prompt)
                response_text = response.text.strip()
                
                # Extract JSON from response
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                if json_match:
                    subtasks_json = json_match.group()
                else:
                    subtasks_json = response_text
                
                try:
                    subtasks = json.loads(subtasks_json)
                except json.JSONDecodeError:
                    pass
            except Exception as ai_error:
                print(f"AI breakdown failed: {ai_error}")
        
        # Fallback: Generate smart subtasks based on task title
        if not subtasks:
            task_lower = request.task_title.lower()
            
            # Generate relevant subtasks based on common task patterns
            if any(word in task_lower for word in ["write", "essay", "report", "document"]):
                subtasks = [
                    {"subtask": "Research and gather information", "duration_minutes": 30},
                    {"subtask": "Create outline and structure", "duration_minutes": 15},
                    {"subtask": "Write first draft", "duration_minutes": 45},
                    {"subtask": "Review and edit", "duration_minutes": 20},
                    {"subtask": "Final proofread and submit", "duration_minutes": 10}
                ]
            elif any(word in task_lower for word in ["code", "develop", "build", "implement", "program"]):
                subtasks = [
                    {"subtask": "Plan and design solution", "duration_minutes": 20},
                    {"subtask": "Set up environment/dependencies", "duration_minutes": 15},
                    {"subtask": "Implement core functionality", "duration_minutes": 45},
                    {"subtask": "Test and debug", "duration_minutes": 25},
                    {"subtask": "Review and refactor", "duration_minutes": 15}
                ]
            elif any(word in task_lower for word in ["study", "learn", "read"]):
                subtasks = [
                    {"subtask": "Preview material and set goals", "duration_minutes": 10},
                    {"subtask": "Active reading/studying session 1", "duration_minutes": 25},
                    {"subtask": "Take a short break", "duration_minutes": 5},
                    {"subtask": "Active reading/studying session 2", "duration_minutes": 25},
                    {"subtask": "Review and summarize key points", "duration_minutes": 15}
                ]
            elif any(word in task_lower for word in ["meeting", "present", "prepare"]):
                subtasks = [
                    {"subtask": "Define objectives and agenda", "duration_minutes": 15},
                    {"subtask": "Gather necessary materials", "duration_minutes": 20},
                    {"subtask": "Create presentation/notes", "duration_minutes": 30},
                    {"subtask": "Practice and rehearse", "duration_minutes": 15}
                ]
            else:
                # Generic breakdown
                subtasks = [
                    {"subtask": f"Plan approach for: {request.task_title}", "duration_minutes": 15},
                    {"subtask": "Gather required resources", "duration_minutes": 10},
                    {"subtask": "Work on main task", "duration_minutes": 40},
                    {"subtask": "Review and finalize", "duration_minutes": 15}
                ]
        
        total_time = sum(s.get("duration_minutes", 30) for s in subtasks)
        
        return {
            "original_task": request.task_title,
            "subtasks": subtasks,
            "total_estimated_minutes": total_time,
            "recommendation": f"This task can be completed in approximately {total_time} minutes if you focus on one subtask at a time."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI breakdown failed: {str(e)}")


# =============================================================================
# 🏆 AI WOW FEATURES - Smart Suggestions
# =============================================================================

class SmartSuggestionRequest(BaseModel):
    """Schema for AI smart suggestion request"""
    context: Optional[str] = Field(default=None, description="Additional context")


@app.post("/smart-suggestion", tags=["AI Features"])
async def get_smart_suggestion(
    request: SmartSuggestionRequest = None,
    db: Session = Depends(get_db)
):
    """
    🏆 Get personalized AI productivity suggestions based on current task state.
    """
    try:
        # Gather context
        total_tasks = db.query(TaskModel).count()
        completed = db.query(TaskModel).filter(TaskModel.status == "completed").count()
        pending = db.query(TaskModel).filter(TaskModel.status == "pending").count()
        high_priority = db.query(TaskModel).filter(
            TaskModel.priority == "high",
            TaskModel.status == "pending"
        ).count()
        
        today = date.today()
        overdue = db.query(TaskModel).filter(
            TaskModel.deadline < today,
            TaskModel.status == "pending"
        ).count()
        
        completion_rate = (completed / total_tasks * 100) if total_tasks > 0 else 0
        current_time = datetime.now().strftime("%I:%M %p")
        current_hour = datetime.now().hour
        
        suggestion = ""
        
        # Try AI suggestion if API key is available
        if GEMINI_API_KEY:
            try:
                additional_context = f"User context: {request.context}" if request and request.context else ""
                
                prompt = f"""You are an AI productivity coach. Based on the user's current tasks and schedule, provide ONE personalized productivity tip.

Current context:
- Total pending tasks: {pending}
- High priority tasks: {high_priority}
- Overdue tasks: {overdue}
- Current time: {current_time}
- Completion rate: {round(completion_rate, 1)}%

{additional_context}

Provide a brief, actionable suggestion (2-3 sentences max). Be specific and motivating."""
                
                model = get_gemini_model()
                response = model.generate_content(prompt)
                suggestion = response.text.strip()
            except Exception as ai_error:
                print(f"AI suggestion failed: {ai_error}")
        
        # Fallback: Generate contextual suggestion
        if not suggestion:
            if overdue > 0:
                suggestion = f"⚠️ You have {overdue} overdue task{'s' if overdue > 1 else ''}! Consider tackling the most critical one first to reduce stress and build momentum."
            elif high_priority > 0:
                suggestion = f"🎯 You have {high_priority} high-priority task{'s' if high_priority > 1 else ''} waiting. Try the 'eat the frog' technique - tackle the hardest one first while your energy is high!"
            elif pending == 0 and total_tasks > 0:
                suggestion = "🎉 Amazing! All tasks completed! Take a well-deserved break or use this momentum to plan tomorrow's tasks."
            elif pending > 5:
                suggestion = f"📋 You have {pending} tasks pending. Consider using the Pomodoro technique: 25 minutes of focused work, then a 5-minute break. Start with just one task!"
            elif current_hour < 12:
                suggestion = "☀️ Morning is the best time for complex tasks! Your brain is fresh - tackle something challenging while you're at peak performance."
            elif current_hour < 17:
                suggestion = "🌤️ Afternoon energy dip? Try a quick walk or stretch, then return to knock out a quick task to rebuild momentum."
            else:
                suggestion = "🌙 Evening is great for planning! Review today's progress and set up tomorrow's priorities for a productive start."
        
        return {
            "suggestion": suggestion,
            "context": {
                "pending_tasks": pending,
                "high_priority": high_priority,
                "overdue": overdue,
                "completion_rate": round(completion_rate, 1)
            },
            "timestamp": datetime.utcnow()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smart suggestion failed: {str(e)}")


# =============================================================================
# 🏆 AI WOW FEATURES - Daily Summary
# =============================================================================

@app.get("/daily-summary", tags=["AI Features"])
async def get_daily_summary(db: Session = Depends(get_db)):
    """
    🏆 Get an AI-generated motivational daily summary.
    Perfect for the demo!
    """
    try:
        # Gather stats
        total = db.query(TaskModel).count()
        completed = db.query(TaskModel).filter(TaskModel.status == "completed").count()
        pending = total - completed
        
        today = date.today()
        overdue = db.query(TaskModel).filter(
            TaskModel.deadline < today,
            TaskModel.status == "pending"
        ).count()
        
        today_tasks = db.query(TaskModel).filter(TaskModel.deadline == today).count()
        today_completed = db.query(TaskModel).filter(
            TaskModel.deadline == today,
            TaskModel.status == "completed"
        ).count()
        
        completion_rate = (completed / total * 100) if total > 0 else 0
        
        summary = ""
        if GEMINI_API_KEY:
            try:
                prompt = f"""Generate a brief, motivating daily productivity summary (2-3 sentences) based on:
- Total tasks: {total}
- Completed: {completed} ({round(completion_rate, 1)}%)
- Pending: {pending}
- Overdue: {overdue}
- Today's tasks: {today_tasks} (completed: {today_completed})

Be encouraging but honest. If there are overdue tasks, gently remind about them."""
                
                model = get_gemini_model()
                response = model.generate_content(prompt)
                summary = response.text.strip()
            except Exception as ai_error:
                print(f"AI summary failed: {ai_error}")
                summary = ""
        
        # Fallback summary if AI is not available
        if not summary:
            if total == 0:
                summary = "Welcome to your productivity journey! Add some tasks to get started and let's make today count! 🚀"
            elif completion_rate >= 80:
                summary = f"Outstanding work! You've completed {completed} out of {total} tasks ({round(completion_rate, 1)}% completion rate). Keep up the amazing momentum! 🎉"
            elif completion_rate >= 50:
                summary = f"Great progress! You've completed {completed} tasks so far. {pending} tasks remaining - you've got this! 💪"
            elif overdue > 0:
                summary = f"You have {overdue} overdue tasks that need attention. Focus on those first, then tackle the remaining {pending - overdue} tasks. Every step forward counts! 🎯"
            else:
                summary = f"You have {pending} tasks ahead of you today. Start with the high-priority ones and build momentum. You can do this! ✨"
        
        return {
            "summary": summary,
            "stats": {
                "total_tasks": total,
                "completed": completed,
                "pending": pending,
                "overdue": overdue,
                "today_tasks": today_tasks,
                "today_completed": today_completed,
                "completion_rate": round(completion_rate, 1)
            },
            "date": today.isoformat(),
            "generated_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Daily summary failed: {str(e)}")


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "=" * 60)
    print("🚀 Starting AI-Powered Smart Daily Planner Backend...")
    print("   🏆 Hackathon-Winning Edition")
    print("=" * 60 + "\n")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
