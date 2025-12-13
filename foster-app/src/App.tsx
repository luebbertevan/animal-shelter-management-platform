import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import AnimalsList from "./pages/animals/AnimalsList";
import AnimalDetail from "./pages/animals/AnimalDetail";
import NewAnimal from "./pages/animals/NewAnimal";
import EditAnimal from "./pages/animals/EditAnimal";
import GroupsList from "./pages/animals/GroupsList";
import GroupDetail from "./pages/animals/GroupDetail";
import NewGroup from "./pages/animals/NewGroup";
import ConversationDetail from "./pages/messaging/ConversationDetail";
import ConversationsList from "./pages/messaging/ConversationsList";
import FostersList from "./pages/fosters/FostersList";
import FosterDetail from "./pages/fosters/FosterDetail";
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
					path="/animals/:id/edit"
					element={
						<ProtectedRoute>
							<EditAnimal />
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
					path="/groups"
					element={
						<ProtectedRoute>
							<GroupsList />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/groups/new"
					element={
						<ProtectedRoute>
							<NewGroup />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/groups/:id"
					element={
						<ProtectedRoute>
							<GroupDetail />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/chats"
					element={
						<ProtectedRoute>
							<ConversationsList />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/chat/:conversationId"
					element={
						<ProtectedRoute>
							<ConversationDetail />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/fosters"
					element={
						<ProtectedRoute>
							<FostersList />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/fosters/:id"
					element={
						<ProtectedRoute>
							<FosterDetail />
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
