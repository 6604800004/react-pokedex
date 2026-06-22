import { createBrowserRouter, RouterProvider, Navigate} from "react-router";
import NotFound from './components/NotFound';
import PokemonList from "./components/PokemonList"
import PokemonDetail from "./components/PokemonDetail";

const router = createBrowserRouter([
  { path: "/", element: < Navigate to="/PokeDex" replace />},
  { path: "/PokeDex", element: <PokemonList /> },
  { path: "/PokeDex/:id", element: <PokemonDetail /> },
  { path: "*", element: <NotFound /> }
]);

function App() {
  return <RouterProvider router={router} />;
}
export default App;
