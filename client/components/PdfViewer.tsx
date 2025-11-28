import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus, RefreshCcw } from "lucide-react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import type { RenderTask } from "pdfjs-dist/types/src/display/api";
import PdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker";

let sharedPdfWorker: Worker | null = null;
if (typeof window !== "undefined") {
  const WorkerConstructor = PdfWorker as unknown as { new (): Worker };
  if (!sharedPdfWorker) {
    sharedPdfWorker = new WorkerConstructor();
  }
  GlobalWorkerOptions.workerPort = sharedPdfWorker;
}

interface PdfViewerProps {
  src: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: (payload: { page: number; percentComplete: number }) => void;
  className?: string;
}

const MIN_SCALE = 0.75;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.25;

export function PdfViewer({ src, title, open, onOpenChange, onClose, className }: PdfViewerProps) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [visiblePage, setVisiblePage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1.25);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseViewport, setBaseViewport] = useState<{ width: number; height: number } | null>(null);

  const visiblePageRef = useRef(visiblePage);
  const pageCountRef = useRef(pageCount);
  const wasOpenRef = useRef(false);
  const isEditingPageInputRef = useRef(false);

  const zoomPercent = useMemo(() => Math.round(scale * 100), [scale]);

  const resetState = useCallback(() => {
    setPdf((previous) => {
      if (previous) {
        void previous.destroy();
      }
      return null;
    });
    setPageCount(0);
    setVisiblePage(1);
    setPageInput("1");
    setScale(1.25);
    setLoadingDocument(false);
    setError(null);
    setBaseViewport(null);
    isEditingPageInputRef.current = false;
    visiblePageRef.current = 1;
    pageCountRef.current = 0;
  }, []);

  useEffect(() => {
    visiblePageRef.current = visiblePage;
    if (!isEditingPageInputRef.current) {
      setPageInput(String(visiblePage));
    }
  }, [visiblePage]);

  useEffect(() => {
    pageCountRef.current = pageCount;
  }, [pageCount]);

  const notifyClose = useCallback(() => {
    if (!onClose) return;
    const page = visiblePageRef.current;
    const count = pageCountRef.current;
    const percent = count > 0 ? (page / count) * 100 : 0;
    onClose({ page, percentComplete: Number(percent.toFixed(2)) });
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        notifyClose();
      }
      resetState();
      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;

    if (!src) {
      setError("PDF source not available");
      setLoadingDocument(false);
      wasOpenRef.current = false;
      return;
    }

    let cancelled = false;
    setLoadingDocument(true);
    setError(null);

    let task: ReturnType<typeof getDocument> | null = null;
    try {
      task = getDocument({ url: src, withCredentials: false });
    } catch (err) {
      setLoadingDocument(false);
      setError(err instanceof Error ? err.message : "Unable to load PDF");
      wasOpenRef.current = false;
      return;
    }

    task.promise
      .then((doc) => {
        if (cancelled) {
          void doc.destroy();
          return;
        }
        setPdf(doc);
        setPageCount(doc.numPages);
        setVisiblePage(1);
        setBaseViewport(null);
        void doc
          .getPage(1)
          .then((page) => {
            if (cancelled) return;
            const viewport = page.getViewport({ scale: 1 });
            setBaseViewport({ width: viewport.width, height: viewport.height*0.74 });
          })
          .catch(() => {
            setBaseViewport(null);
          });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || "Unable to load PDF");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDocument(false);
        }
      });

    return () => {
      cancelled = true;
      if (wasOpenRef.current && open) {
        notifyClose();
        wasOpenRef.current = false;
      }
      resetState();
    };
  }, [open, src, resetState, notifyClose]);

  useEffect(() => () => resetState(), [resetState]);

  const changeScale = useCallback((next: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    setScale(Number(clamped.toFixed(2)));
  }, []);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (!pageCount) return;
      const clamped = Math.min(pageCount, Math.max(1, Math.round(targetPage)));
      isEditingPageInputRef.current = false;
      visiblePageRef.current = clamped;
      setVisiblePage(clamped);
      setPageInput(String(clamped));
    },
    [pageCount],
  );

  const handlePageInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const sanitized = event.target.value.replace(/\D/g, "");
    setPageInput(sanitized);
  }, []);

  const handlePageInputCommit = useCallback(() => {
    if (!pageCount) return;
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(visiblePageRef.current));
      return;
    }
    goToPage(parsed);
  }, [pageCount, pageInput, goToPage]);

  const handlePageInputFocus = useCallback(() => {
    isEditingPageInputRef.current = true;
  }, []);

  const handlePageInputBlur = useCallback((event: FocusEvent<HTMLInputElement>) => {
    isEditingPageInputRef.current = false;
    if (!event.currentTarget.value) {
      setPageInput(String(visiblePageRef.current));
    }
  }, []);

  const handlePageInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handlePageInputCommit();
      }
    },
    [handlePageInputCommit],
  );

  const handlePreviousPage = useCallback(() => {
    if (!pageCount) return;
    goToPage(visiblePage - 1);
  }, [goToPage, pageCount, visiblePage]);

  const handleNextPage = useCallback(() => {
    if (!pageCount) return;
    goToPage(visiblePage + 1);
  }, [goToPage, pageCount, visiblePage]);

  const canGoPrevious = pageCount > 0 && visiblePage > 1;
  const canGoNext = pageCount > 0 && visiblePage < pageCount;
  const canCommitPage = pageCount > 0 && pageInput.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-full max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-6xl h-[90vh] max-h-[95vh] grid grid-rows-[auto_1fr] overflow-hidden",
          className,
        )}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline">
              Page {Math.min(visiblePage, pageCount || 1)} of {pageCount || "--"}
            </Badge>
            <span className="hidden sm:inline">Zoom: {zoomPercent}%</span>
          </div>
        </DialogHeader>

        <div className="flex h-full flex-col gap-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousPage}
                disabled={!canGoPrevious}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[80px] text-center text-xs text-muted-foreground">
                {pageCount ? `${visiblePage} / ${pageCount}` : "--"}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPage}
                disabled={!canGoNext}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="flex items-center gap-2">
                <Input
                  value={pageInput}
                  onChange={handlePageInputChange}
                  onFocus={handlePageInputFocus}
                  onBlur={handlePageInputBlur}
                  onKeyDown={handlePageInputKeyDown}
                  disabled={!pageCount}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Go to page"
                  aria-label="Go to page"
                  autoComplete="off"
                  className="h-9 w-24"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePageInputCommit}
                  disabled={!canCommitPage}
                >
                  Go
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => changeScale(scale - SCALE_STEP)}
                  disabled={scale <= MIN_SCALE}
                  aria-label="Zoom out"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-xs text-muted-foreground">{zoomPercent}%</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => changeScale(1.25)}
                  aria-label="Reset zoom"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => changeScale(scale + SCALE_STEP)}
                  disabled={scale >= MAX_SCALE}
                  aria-label="Zoom in"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="relative flex flex-1 min-h-0 items-center justify-center overflow-hidden rounded-lg border bg-background/80 p-4">
            {(loadingDocument || (!pdf && !error)) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {error ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
                <p>{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    if (pdf) {
                      setVisiblePage(1);
                      setPageInput("1");
                    } else {
                      onOpenChange(false);
                      requestAnimationFrame(() => onOpenChange(true));
                    }
                  }}
                >
                  Try again
                </Button>
              </div>
            ) : pdf && pageCount > 0 ? (
              <PdfPageCanvas pdf={pdf} pageNumber={visiblePage} scale={scale} baseViewport={baseViewport} />
            ) : (
              <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PdfPageCanvasProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  baseViewport: { width: number; height: number } | null;
}

function PdfPageCanvas({ pdf, pageNumber, scale, baseViewport }: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [rendering, setRendering] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number } | null>(null);

  const containerStyle = useMemo(() => {
    const base = baseViewport ?? containerDimensions;
    if (!base) return undefined;
    const width = Math.max(1, Math.round(base.width * scale));
    const height = Math.max(1, Math.round(base.height * scale));
    return { width: `${width}px`, height: `${height}px`, maxWidth: "100%", maxHeight: "100%" };
  }, [baseViewport, containerDimensions, scale]);

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!canvasRef.current) return;
      try {
        setRendering(true);
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewportAtScale1 = page.getViewport({ scale: 1 });
        const referenceWidth = baseViewport?.width ?? viewportAtScale1.width;
        const referenceHeight = baseViewport?.height ?? viewportAtScale1.height;
        const safeReferenceWidth = referenceWidth > 0 ? referenceWidth : viewportAtScale1.width;
        const safeReferenceHeight = referenceHeight > 0 ? referenceHeight : viewportAtScale1.height;

        setContainerDimensions({ width: safeReferenceWidth, height: safeReferenceHeight });

        const fitRatioWidth = safeReferenceWidth / viewportAtScale1.width;
        const fitRatioHeight = safeReferenceHeight / viewportAtScale1.height;
        const fitRatio = Number.isFinite(fitRatioWidth) && Number.isFinite(fitRatioHeight)
          ? Math.min(fitRatioWidth, fitRatioHeight)
          : 1;
        const adjustedScale = scale * (fitRatio > 0 ? fitRatio : 1);

        const viewport = page.getViewport({ scale: adjustedScale });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;

        renderTaskRef.current?.cancel();
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const renderTask = page.render({ canvasContext: context, canvas, viewport });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (error) {
        if (!cancelled && (error as any)?.name !== "RenderingCancelledException") {
          console.error(`Failed to render page ${pageNumber}`, error);
        }
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdf, pageNumber, scale, baseViewport]);

  return (
    <div className="relative flex justify-center">
      <div
        className="relative flex max-h-full max-w-full items-center justify-center overflow-hidden rounded-md bg-background p-2 shadow-inner"
        style={containerStyle}
      >
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <canvas ref={canvasRef} className="max-h-full max-w-full shadow-xl" />
      </div>
    </div>
  );
}

export default PdfViewer;
