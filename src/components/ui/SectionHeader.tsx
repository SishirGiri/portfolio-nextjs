export default function SectionHeader({
  number,
  title,
  highlight,
}: {
  number: string;
  title: string;
  highlight: string;
}) {
  return (
    <div className="section-header reveal">
      <span className="section-number">{number}</span>
      <h2 className="section-title">
        {title} <em>{highlight}</em>
      </h2>
      <div className="section-line" />
    </div>
  );
}
