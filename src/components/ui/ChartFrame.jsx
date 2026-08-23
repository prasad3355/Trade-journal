import { useEffect, useState } from "react";

function ChartFrame({
  trade,
  image: imageProp,
  className = "",
  onClick,
  style,
}) {
  const [status, setStatus] = useState("loading");
  const image = imageProp || trade.images?.[0] || trade.image;
  const hasImage = Boolean(image) && status !== "error";
  useEffect(() => setStatus("loading"), [image]);
  return (
    <div
      style={style}
      className={`chart-frame ${className} ${onClick ? "chart-frame--interactive" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick ? (event) => event.key === "Enter" && onClick() : undefined
      }
    >
      {hasImage ? (
        <>
          <img
            src={image}
            loading="lazy"
            onLoad={() => setStatus("ready")}
            onError={() => setStatus("error")}
            alt={`${trade.pair} trade chart`}
          />
          {status === "loading" && (
            <span className="chart-loading">Loading chart…</span>
          )}
        </>
      ) : (
        <div
          className="chart-fallback chart-fallback--missing"
          aria-label={`${trade.pair} chart unavailable`}
        >
          <span className="chart-fallback__symbol">{trade.pair}</span>
          <div className="chart-grid" />
          <div className="chart-marker chart-marker--entry">
            {image ? "Image unavailable" : "No chart attached"}
          </div>
          <div className="chart-marker chart-marker--exit">
            {trade.exitLogic}
          </div>
        </div>
      )}
      {onClick && (
        <span className="chart-frame__expand">
          ↗ <b>View chart</b>
        </span>
      )}
    </div>
  );
}
export default ChartFrame;
