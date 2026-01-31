import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "./pages/LandingPage";
import GoalSetup from "./pages/GoalSetup";
import TaskInput from "./pages/TaskInput";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import History from "./pages/History";
import Navigation from "./components/Navigation";
import ScrollToTop from "./components/ScrollToTop";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ScrollToTop />
        <Navigation />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/goals" element={<GoalSetup />} />
          <Route path="/setup" element={<GoalSetup />} />
          <Route path="/tasks" element={<TaskInput />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
