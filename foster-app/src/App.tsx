import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import AnimalsList from "./pages/animals/AnimalsList";
import AnimalDetail from "./pages/animals/AnimalDetail";
import NewAnimal from "./pages/animals/NewAnimal";
import ConversationDetail from "./pages/messaging/ConversationDetail";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/login" element={<Login />} />
				<Route path="/signup" element={<SignUp />} />
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<Dashboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/animals"
					element={
						<ProtectedRoute>
							<AnimalsList />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/animals/new"
					element={
						<ProtectedRoute>
							<NewAnimal />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/animals/:id/:slug?"
					element={
						<ProtectedRoute>
							<AnimalDetail />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/messages/:conversationId"
					element={
						<ProtectedRoute>
							<ConversationDetail />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/"
					element={<Navigate to="/dashboard" replace />}
				/>
			</Routes>
		</BrowserRouter>
	);
}

export default App;
