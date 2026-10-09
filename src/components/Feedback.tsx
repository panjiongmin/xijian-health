export function Feedback({ error, loading, retry }: {
    error: string;
    loading: boolean;
    retry: () => void;
}) {
    if (loading)
        return <div className="loading-skeleton" aria-label="正在加载"/>;
    return error ? <div className="error-notice" role="alert">{error}<button className="text-button" onClick={retry}>重试</button></div> : null;
}
