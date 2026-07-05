import { redirect } from 'next/navigation';

export default function Home() {
  // This will be replaced with actual auth check in Task 5
  redirect('/login');
}
