import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import { PhotoProvider } from "@/context/PhotoContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <PhotoProvider>
      <Router />
    </PhotoProvider>
  );
}

export default App;
