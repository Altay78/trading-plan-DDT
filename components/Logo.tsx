// Marque DDT en chrome (effet métallique animé via .chrome-text dans globals.css).
export default function Logo({
  className = "",
  stacked = false,
}: {
  className?: string;
  stacked?: boolean;
}) {
  return (
    <span
      className={`chrome-text font-extrabold tracking-tight ${
        stacked ? "flex flex-col leading-[0.82]" : ""
      } ${className}`}
      aria-label="DDT"
    >
      {stacked ? (
        <>
          <span>D</span>
          <span>D</span>
          <span>T</span>
        </>
      ) : (
        "DDT"
      )}
    </span>
  );
}
