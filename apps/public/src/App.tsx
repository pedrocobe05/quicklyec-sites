import { Route, Routes } from 'react-router-dom';
import { BookingPage } from './pages/BookingPage';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { ContactPage } from './pages/ContactPage';
import { PayphoneReturnPage } from './pages/PayphoneReturnPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/book" element={<BookingPage />} />
      <Route path="/payphone/return" element={<PayphoneReturnPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/reservar" element={<BookingPage />} />
      <Route path="/servicios" element={<ServicesPage />} />
      <Route path="/contacto" element={<ContactPage />} />
    </Routes>
  );
}
