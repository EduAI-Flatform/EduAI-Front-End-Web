
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./features/home/HomePage";
import Header from "./components/layout/header";

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <Header />

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
