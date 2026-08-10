import { redirect } from 'next/navigation';

export default function Home() {
  // Mengarahkan root URL (/) langsung ke halaman login
  redirect('/login');
}