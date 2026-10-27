import Navigasjon from "./components/Navigasjon";
import ForsideInnhold from "./components/ForsideInnhold";

export default function Home() {
  return <main className="forside-bakgrunn min-h-screen bg-white text-slate-900"><Navigasjon /><ForsideInnhold /></main>;
}
