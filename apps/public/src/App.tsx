import { Route, Routes } from 'react-router-dom';
import { BookingPage } from './pages/BookingPage';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { ContactPage } from './pages/ContactPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/reservar" element={<BookingPage />} />
      <Route path="/servicios" element={<ServicesPage />} />
      <Route path="/contacto" element={<ContactPage />} />
    </Routes>
  );
}
