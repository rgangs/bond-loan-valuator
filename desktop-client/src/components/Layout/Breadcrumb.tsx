import { Link, useLocation } from "react-router-dom";
import { Fragment } from "react";

const formatSegment = (segment: string) =>
  segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const Breadcrumb = () => {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="font-medium text-slate-300">Home</span>
        <span>/</span>
        <span>Progress Dashboard</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-2 text-xs text-slate-400">
      <Link className="font-medium text-slate-300 transition hover:text-blue-300" to="/">
        Home
      </Link>
      {segments.map((segment, index) => {
        const path = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        return (
          <Fragment key={path}>
            <span>/</span>
            {isLast ? (
              <span className="font-medium text-slate-200">{formatSegment(segment)}</span>
            ) : (
              <Link className="transition hover:text-blue-300" to={path}>
                {formatSegment(segment)}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
