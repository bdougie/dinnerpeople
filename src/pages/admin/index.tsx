import { Routes, Route } from "react-router-dom";
import AdminSandbox from "./sandbox";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/sandbox" element={<AdminSandbox />} />
      {/* Add other admin routes here */}
    </Routes>
  );
}
