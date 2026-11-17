import { Link } from "react-router-dom";

type BrandProps = {
  className?: string;
  to?: string;
  markWidth?: number;
  markHeight?: number;
};

export function Brand({
  className = "brand",
  to = "/",
  markWidth = 52,
  markHeight = 52,
}: BrandProps) {
  return (
    <Link className={className} to={to}>
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
    </Link>
  );
}
