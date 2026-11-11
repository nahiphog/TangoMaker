import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefers = stored === "dark";
    setDark(prefers);
    document.documentElement.classList.toggle("dark", prefers);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

function AboutButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          About
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>About</DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-relaxed text-foreground">
            I've created this page for the sole purpose of generating Tango puzzles through the
            &ldquo;digging&rdquo; method alone.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link
          to="/tango"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground"
        >
          <img
            src={`${import.meta.env.BASE_URL}tango-mark.svg`}
            alt=""
            width={32}
            height={32}
            className="shrink-0"
          />
          Tango Generator
        </Link>
        <div className="flex items-center gap-1">
          <Link
            to="/techniques"
            className="rounded-md px-2 py-2 text-sm font-medium hover:bg-accent"
          >
            Techniques
          </Link>
          <AboutButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
