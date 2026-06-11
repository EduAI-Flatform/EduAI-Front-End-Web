
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./features/home/HomePage";
import Header from "./components/layout/header";

export function App() {
  return (
   <BrowserRouter>
      <div >
        <Header />

        <div style={{ flex: 1, padding: "20px" }}>
          <Routes>
            <Route path="/" element={<HomePage />} />

            
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
