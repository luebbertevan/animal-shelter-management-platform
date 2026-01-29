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
import EditGroup from "./pages/animals/EditGroup";
import ConversationDetail from "./pages/messaging/ConversationDetail";
import ConversationsList from "./pages/messaging/ConversationsList";
import FostersList from "./pages/fosters/FostersList";
import FosterDetail from "./pages/fosters/FosterDetail";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedLayout from "./components/ProtectedLayout";
import CoordinatorOnlyRoute from "./components/CoordinatorOnlyRoute";
import FostersNeeded from "./pages/fosters/FostersNeeded";
import FosterRequests from "./pages/fosters/FosterRequests";

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
							<ProtectedLayout>
								<Dashboard />
							</ProtectedLayout>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/animals"
					element={
						<ProtectedRoute>
							<CoordinatorOnlyRoute>
								<ProtectedLayout>
									<AnimalsList />
								</ProtectedLayout>
							</CoordinatorOnlyRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/animals/new"
					element={
						<ProtectedRoute>
							<ProtectedLayout>
								<NewAnimal />
							</ProtectedLayout>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/animals/:id/edit"
					element={
						<ProtectedRoute>
							<ProtectedLayout>
								<EditAnimal />
							</ProtectedLayout>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/animals/:id/:slug?"
					element={
						<ProtectedRoute>
							<ProtectedLayout>
								<AnimalDetail />
							</ProtectedLayout>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/groups"
					element={
						<ProtectedRoute>
							<CoordinatorOnlyRoute>
								<ProtectedLayout>
									<GroupsList />
								</ProtectedLayout>
							</CoordinatorOnlyRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/groups/new"
					element={
						<ProtectedRoute>
							<ProtectedLayout>
								<NewGroup />
							</ProtectedLayout>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/groups/:id/edit"
					element={
						<ProtectedRoute>
							<ProtectedLayout>
								<EditGroup />
							</ProtectedLayout>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/groups/:id"
					element={
						<ProtectedRoute>
							<ProtectedLayout>
								<GroupDetail />
							</ProtectedLayout>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/chats"
					element={
						<ProtectedRoute>
							<ProtectedLayout>
								<ConversationsList />
							</ProtectedLayout>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/chat/:conversationId"
					element={
						<ProtectedRoute>
							<ProtectedLayout>
								<ConversationDetail />
							</ProtectedLayout>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/fosters-needed"
					element={
						<ProtectedRoute>
							<ProtectedLayout>
								<FostersNeeded />
							</ProtectedLayout>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/foster-requests"
					element={
						<ProtectedRoute>
							<CoordinatorOnlyRoute>
								<ProtectedLayout>
									<FosterRequests />
								</ProtectedLayout>
							</CoordinatorOnlyRoute>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/fosters"
					element={
						<ProtectedRoute>
							<ProtectedLayout>
								<FostersList />
							</ProtectedLayout>
						</ProtectedRoute>
					}
				/>
				<Route
					path="/fosters/:id"
					element={
						<ProtectedRoute>
							<ProtectedLayout>
								<FosterDetail />
							</ProtectedLayout>
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
