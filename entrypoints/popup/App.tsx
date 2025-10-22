import reactLogo from "@/assets/react.svg";
import { useState } from "react";
import "./App.css";
import wxtLogo from "/wxt.svg";

function App() {
	const [count, setCount] = useState(0);

	return (
		<div className="min-h-screen bg-gray-100 p-8">
			{/* Test Tailwind classes */}
			<div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-lg mb-6">
				<h1 className="text-2xl font-bold">🎓 Degree Audit Plus</h1>
				<p className="text-sm opacity-90">Enhanced degree audit experience</p>
			</div>

			<div className="bg-white rounded-lg shadow-lg p-6">
				<div className="flex justify-center space-x-4 mb-6">
					<a
						href="https://wxt.dev"
						target="_blank"
						className="hover:opacity-80 transition-opacity"
					>
						<img src={wxtLogo} className="h-16 w-16" alt="WXT logo" />
					</a>
					<a
						href="https://react.dev"
						target="_blank"
						className="hover:opacity-80 transition-opacity"
					>
						<img src={reactLogo} className="h-16 w-16" alt="React logo" />
					</a>
				</div>

				<div className="text-center">
					<button
						onClick={() => setCount((count) => count + 1)}
						className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
					>
						count is {count}
					</button>
					<p className="mt-4 text-gray-600">
						Edit{" "}
						<code className="bg-gray-200 px-2 py-1 rounded">src/App.tsx</code>{" "}
						and save to test HMR
					</p>
				</div>
			</div>
		</div>
	);
}

export default App;
