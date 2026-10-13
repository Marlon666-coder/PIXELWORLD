"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onError: () => void;
}

/** Any failure inside the decorative 3D scene falls back to the static artwork. */
export class WorldErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.warn("[world] 3D scene disabled; showing static fallback.", error);
    this.props.onError();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
