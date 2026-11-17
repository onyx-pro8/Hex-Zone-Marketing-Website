type BrandProps = {
  className?: string;
  href?: string;
  markWidth?: number;
  markHeight?: number;
};

export function Brand({
  className = "brand",
  href = "/",
  markWidth = 52,
  markHeight = 52,
}: BrandProps) {
  return (
    <a className={className} href={href}>
      <img
        className="brand__mark"
        src="/assets/logo.png"
        width={markWidth}
        height={markHeight}
        alt=""
        decoding="async"
      />
      <span className="brand__name">
        Safe <span className="brand__accent">Zone</span> Patrol
      </span>
    </a>
  );
}
