'use client';

import { useRef, useEffect, useState } from 'react';

export function DualScrollTable({ children }: { children: React.ReactNode }) {
  const topRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [innerWidth, setInnerWidth] = useState(0);
  const syncing = useRef(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    // The shadcn Table renders its own overflow-auto div as the first child
    const scrollEl = (wrapper.firstElementChild as HTMLElement) ?? wrapper;

    const update = () => {
      const table = scrollEl.querySelector('table');
      setInnerWidth(table ? table.scrollWidth : scrollEl.scrollWidth);
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const top = topRef.current;
    const wrapper = wrapperRef.current;
    if (!top || !wrapper) return;
    const scrollEl = (wrapper.firstElementChild as HTMLElement) ?? wrapper;

    const onTopScroll = () => {
      if (syncing.current) return;
      syncing.current = true;
      scrollEl.scrollLeft = top.scrollLeft;
      syncing.current = false;
    };

    const onBottomScroll = () => {
      if (syncing.current) return;
      syncing.current = true;
      top.scrollLeft = scrollEl.scrollLeft;
      syncing.current = false;
    };

    top.addEventListener('scroll', onTopScroll);
    scrollEl.addEventListener('scroll', onBottomScroll);
    return () => {
      top.removeEventListener('scroll', onTopScroll);
      scrollEl.removeEventListener('scroll', onBottomScroll);
    };
  }, []);

  return (
    <>
      <div ref={topRef} className="overflow-x-scroll overflow-y-hidden">
        <div style={{ width: innerWidth, height: 1 }} suppressHydrationWarning />
      </div>
      <div ref={wrapperRef}>
        {children}
      </div>
    </>
  );
}
