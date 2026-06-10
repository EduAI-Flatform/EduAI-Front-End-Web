import { MainLayout } from "./layouts/MainLayout";
import { HomePage } from "./features/home/HomePage";

export function App() {
  return (
    <MainLayout>
      <HomePage />
    </MainLayout>
  );
}
