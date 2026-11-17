type IconProps = {
  id: string;
  className?: string;
  viewBox?: string;
};

export function Icon({ id, className = "icon", viewBox }: IconProps) {
  return (
    <svg className={className} viewBox={viewBox} aria-hidden="true" focusable="false">
      <use href={`#${id}`} />
    </svg>
  );
}
