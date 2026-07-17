"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import Header from "@/components/Header";

type ApplicationShellProps = {
  children: ReactNode;
  className?: string;
  protectedPage?: boolean;
};

export function ApplicationShell({ children, className = "", protectedPage = true }: ApplicationShellProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={`tm-app-shell ${className}`} data-protected={protectedPage ? "true" : "false"}>
      <Header />
      <motion.main
        className="tm-app-main"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="te-page-container">{children}</div>
      </motion.main>
    </div>
  );
}
