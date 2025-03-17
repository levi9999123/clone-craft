import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import { PhotoProvider } from "@/context/PhotoContext";
import { ModalProvider } from "@/context/ModalContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/toaster";

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
    <ThemeProvider>
      <ModalProvider>
        <PhotoProvider>
          <Router />
          <Toaster />
        </PhotoProvider>
      </ModalProvider>
    </ThemeProvider>
  );
}

export default App;
