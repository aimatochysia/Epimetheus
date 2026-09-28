import { useEffect, useRef } from "react";
import { createField } from "../garden/field.js";

export function Sand({ boardRef, theme, signature, hold, reduce }) {
  const canvasRef = useRef(null);
  const fieldRef = useRef(null);
  const themeRef = useRef(theme);
  const previous = useRef(null);
  themeRef.current = theme;

  useEffect(() => {
    const field = createField(canvasRef.current);
    fieldRef.current = field;
    if (!field) document.body.classList.add("no-gl");
    return () => {
      fieldRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (hold || !fieldRef.current) return undefined;
    const layoutChanged = previous.current !== null && previous.current !== signature;
    previous.current = signature;
    const delay = layoutChanged && !reduce ? 420 : 0;
    const timer = setTimeout(() => {
      fieldRef.current?.draw(boardRef.current, themeRef.current);
    }, delay);
    return () => clearTimeout(timer);
  }, [boardRef, signature, hold, reduce, theme]);

  useEffect(() => {
    if (hold) return undefined;
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        fieldRef.current?.draw(boardRef.current, themeRef.current);
      }, reduce ? 0 : 420);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [boardRef, hold, reduce, theme]);

  return <canvas ref={canvasRef} className="sand" aria-hidden="true" />;
}
