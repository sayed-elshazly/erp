import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#121215] text-white flex items-center justify-center p-6" dir="rtl">
          <div className="max-w-md w-full bg-[#18181B] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 mx-auto flex items-center justify-center text-2xl font-bold">
              ⚠
            </div>
            <h2 className="text-lg font-black text-white">حدث خطأ أثناء تحميل النظام</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              واجه التطبيق استثناءً غير متوقع. يمكنك إعادة تحميل الصفحة أو إعادة تعيين التخزين المؤقت.
            </p>
            {this.state.error && (
              <div className="p-3 rounded-xl bg-black/50 border border-zinc-800 text-left font-mono text-[11px] text-red-400 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 font-bold text-xs text-white transition-all cursor-pointer"
              >
                إعادة تحميل الصفحة
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-bold text-xs text-zinc-300 transition-all cursor-pointer"
              >
                تصفير الكاش المؤقت
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
